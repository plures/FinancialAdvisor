# Network Configuration Guide

This guide explains how to configure network access and firewall rules for the FinancialAdvisor project's CI/CD pipelines and workflows.

## Overview

The FinancialAdvisor project requires external network access for several services during CI/CD workflows:

- **OpenAI API** - For AI integration testing and validation
- **NPM Registry** - For package installation and management
- **GitHub API** - For workflow execution and release management
- **Codecov** - For code coverage reporting
- **Security Scanners** - For vulnerability and dependency scanning

## Required Network Access

### OpenAI API Access

The most critical external service for this project is the OpenAI API, which is used by the AI integration features.

**Domain:** `api.openai.com`  
**Port:** 443 (HTTPS)  
**Required for:**

- Integration tests in `packages/ai-integration`
- AI provider functionality validation
- Financial analysis features

### Configuration Steps

#### For GitHub-hosted Runners (Recommended)

GitHub-hosted runners have unrestricted outbound internet access by default. No additional configuration is needed unless your organization uses IP allow lists.

#### For Organizations with IP Allow Lists

If your GitHub organization uses IP allow lists for security:

1. **Navigate to Organization Settings:**

   ```
   GitHub Organization → Settings → Security → IP allow list
   ```

2. **Add allowed domains:**

   For OpenAI API:

   ```
   Domain: api.openai.com
   Protocol: HTTPS
   Port: 443
   ```

3. **Add GitHub Actions IP ranges:**

   GitHub Actions runners use dynamic IPs. Add the current ranges:

   ```bash
   # Fetch current GitHub Actions IP ranges
   curl https://api.github.com/meta | jq '.actions'
   ```

   Add each IP range to your allow list.

4. **Additional recommended domains:**
   ```
   - registry.npmjs.org (NPM packages)
   - codecov.io (Coverage reporting)
   - api.osv.dev (Security scanning)
   ```

#### For Self-hosted Runners

If you're using self-hosted runners, configure your firewall to allow outbound HTTPS connections:

1. **Firewall Rules (iptables example):**

   ```bash
   # Allow HTTPS to OpenAI API
   sudo iptables -A OUTPUT -p tcp --dport 443 -d api.openai.com -j ACCEPT

   # Allow HTTPS to NPM registry
   sudo iptables -A OUTPUT -p tcp --dport 443 -d registry.npmjs.org -j ACCEPT

   # Allow HTTPS to GitHub API
   sudo iptables -A OUTPUT -p tcp --dport 443 -d api.github.com -j ACCEPT
   ```

2. **Corporate Proxy Configuration:**

   If using a corporate proxy:

   ```bash
   # Set proxy environment variables
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   export NO_PROXY=localhost,127.0.0.1
   ```

   Add these to your runner's environment configuration.

3. **DNS Resolution:**

   Ensure your runner can resolve external domains:

   ```bash
   # Test DNS resolution
   nslookup api.openai.com
   dig api.openai.com
   ```

## Security Considerations

### API Key Management

OpenAI API access requires an API key. Store it securely as a GitHub secret:

1. **Create the secret:**

   ```
   Repository → Settings → Secrets and variables → Actions → New repository secret
   ```

   Name: `OPENAI_API_KEY`  
   Value: `sk-...` (your OpenAI API key)

2. **Use in workflows:**
   ```yaml
   env:
     OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

### Network Security Best Practices

1. **Use HTTPS only** - All external API calls use encrypted HTTPS connections
2. **Minimize exposed secrets** - API keys are encrypted and only available during workflow execution
3. **Limit IP ranges** - Use the most restrictive IP ranges possible for self-hosted runners
4. **Monitor traffic** - Log and monitor network traffic from CI/CD runners
5. **Regular updates** - Keep GitHub Actions IP ranges updated if using IP allow lists

## Workflow Configuration

The following workflows require network access:

### CI/CD Pipeline (`.github/workflows/ci.yml`)

**Jobs requiring network access:**

- `lint` - Downloads NPM dependencies
- `typecheck` - Downloads NPM dependencies
- `test` - Downloads NPM dependencies, runs OpenAI integration tests
- `package` - Downloads NPM dependencies
- `security` - Downloads NPM dependencies, runs security scans

### Security Scanning (`.github/workflows/security.yml`)

**Jobs requiring network access:**

- `codeql` - Downloads NPM dependencies, uploads results to GitHub
- `dependency-scan` - Downloads NPM dependencies, runs OSV scanner
- `sbom` - Downloads NPM dependencies, generates SBOM
- `secret-scan` - Scans repository for secrets
- `license-scan` - Downloads NPM dependencies, checks licenses

### Release Pipeline (`.github/workflows/release.yml`)

**Jobs requiring network access:**

- `release` - Downloads NPM dependencies, builds and packages
- `publish` - Publishes to NPM registry and VS Code marketplace

## Troubleshooting

### Network Connection Errors

If you see errors like:

```
Error: connect ETIMEDOUT api.openai.com:443
Error: getaddrinfo ENOTFOUND api.openai.com
```

**Solutions:**

1. Verify the domain is in your allow list
2. Check firewall rules allow outbound HTTPS to the domain
3. Verify DNS resolution works from the runner
4. Check for proxy configuration issues

### OpenAI API Errors

If OpenAI API tests fail:

```
Error: OpenAI API error: Request failed with status code 401
```

**Solutions:**

1. Verify `OPENAI_API_KEY` secret is set correctly
2. Check the API key is valid and has sufficient quota
3. Verify network access to `api.openai.com` is allowed

### NPM Installation Failures

If NPM dependencies fail to install:

```
Error: npm ERR! network request failed
```

**Solutions:**

1. Verify access to `registry.npmjs.org` is allowed
2. Check for proxy configuration if using a corporate network
3. Verify DNS resolution for NPM registry domains

## Validation

After configuring network access, validate it works:

1. **Trigger a workflow run:**

   ```bash
   # Via GitHub UI: Actions → CI/CD Pipeline → Run workflow
   # Or push a commit to trigger the workflow
   git commit --allow-empty -m "Test network configuration"
   git push
   ```

2. **Monitor workflow logs:**
   - Check each job completes successfully
   - Look for network-related errors
   - Verify API calls succeed

3. **Verify specific functionality:**

   ```bash
   # Check NPM installation works
   npm ci

   # Check OpenAI API access works (locally with API key)
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

## Reference

- [Network Policy Configuration](../../.github/network-policy.yml) - Complete network policy specification
- [GitHub Actions IP Ranges](https://api.github.com/meta) - Current GitHub Actions IP ranges
- [GitHub IP Allow List Documentation](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/managing-allowed-ip-addresses-for-your-organization)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)

## Support

If you continue to experience network connectivity issues:

1. Check the [network-policy.yml](../../.github/network-policy.yml) file for the complete list of required services
2. Review workflow logs for specific error messages
3. Open an issue with details about the network error
4. Contact your organization's network administrator for assistance with firewall configuration

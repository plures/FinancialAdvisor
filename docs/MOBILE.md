# Mobile Platform Support

Financial Advisor now supports iOS and Android mobile platforms through Tauri v2.

## Prerequisites

### iOS Development

- macOS with Xcode installed
- iOS SDK (minimum version 13.0)
- Xcode Command Line Tools
- CocoaPods for dependency management

### Android Development

- Android Studio
- Android SDK (minimum SDK version 24 / Android 7.0)
- Java Development Kit (JDK) 17+
- Android NDK

## Setup Instructions

### iOS Setup

1. **Initialize iOS Project**

   ```bash
   npm run tauri ios init
   ```

2. **Run in Development**

   ```bash
   npm run tauri:ios
   ```

3. **Build for Production**
   ```bash
   npm run tauri:ios:build
   ```

### Android Setup

1. **Initialize Android Project**

   ```bash
   npm run tauri android init
   ```

2. **Run in Development**

   ```bash
   npm run tauri:android
   ```

3. **Build for Production**
   ```bash
   npm run tauri:android:build
   ```

## Configuration

The mobile platform configurations are defined in `src-tauri/tauri.conf.json`:

### iOS Configuration

- **Minimum iOS Version**: 13.0
- **App Identifier**: com.plures.financial-advisor
- **Bundle Name**: Financial Advisor

### Android Configuration

- **Minimum SDK Version**: 24 (Android 7.0)
- **Target SDK Version**: Latest stable
- **App ID**: com.plures.financial_advisor

## Features

All desktop features are available on mobile:

- ✅ Account Management
- ✅ Transaction Tracking
- ✅ Budget Management
- ✅ Goals Tracking
- ✅ Financial Reports with Charts
- ✅ AI-Powered Categorization
- ✅ Local Data Storage

## Mobile-Specific Considerations

### Data Storage

- Uses platform-specific secure storage
- Data is stored locally on the device
- No cloud sync by default (privacy-first)

### Performance

- Optimized for mobile screens
- Responsive design adapts to screen sizes
- Charts are touch-friendly

### Permissions

**iOS Permissions** (Info.plist):

- No special permissions required for basic functionality
- Optional: Camera for receipt scanning (future feature)

**Android Permissions** (AndroidManifest.xml):

- No special permissions required for basic functionality
- Optional: Camera for receipt scanning (future feature)

## Testing

### iOS Testing

1. Use Xcode Simulator for quick testing
2. Test on physical devices before release
3. Follow Apple's App Store guidelines

### Android Testing

1. Use Android Emulator for quick testing
2. Test on various screen sizes
3. Test on different Android versions (7.0+)
4. Follow Google Play Store guidelines

## Distribution

### iOS App Store

1. Create Apple Developer Account
2. Configure app signing in Xcode
3. Build release version
4. Upload to App Store Connect
5. Submit for review

### Google Play Store

1. Create Google Play Developer Account
2. Generate signing key
3. Build release APK/AAB
4. Upload to Google Play Console
5. Submit for review

## Limitations

Current limitations for mobile:

- Desktop-first UI may need mobile optimization
- Large charts may need scrolling on small screens
- File import/export may need platform-specific handling

## Future Enhancements

Planned mobile features:

- Receipt scanning with OCR
- Biometric authentication
- Push notifications for budget alerts
- Widgets for quick balance view
- Apple Pay / Google Pay integration
- Location-based transaction tagging

## Troubleshooting

### Common Issues

**iOS Build Fails**

- Ensure Xcode is up to date
- Clean build folder: `rm -rf src-tauri/gen`
- Check code signing settings

**Android Build Fails**

- Verify ANDROID_HOME is set
- Update Android SDK
- Clean gradle cache: `./gradlew clean`

**App Crashes on Launch**

- Check device logs in Xcode/Android Studio
- Verify minimum OS version compatibility
- Check for missing permissions

## Resources

- [Tauri Mobile Documentation](https://tauri.app/v2/guides/mobile/)
- [iOS Development Guide](https://developer.apple.com/documentation/)
- [Android Development Guide](https://developer.android.com/docs)

## Support

For mobile-specific issues:

1. Check [GitHub Issues](https://github.com/plures/FinancialAdvisor/issues)
2. Review Tauri mobile examples
3. Consult platform-specific documentation

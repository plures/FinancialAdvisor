// @deprecated — use @financialadvisor/domain, @financialadvisor/ledger or @financialadvisor/ingestion directly.
// This package is kept for backward compatibility only.
/** @deprecated Use `@financialadvisor/domain` directly. Re-exports all domain types and utilities. */
export * from '@financialadvisor/domain';
/** @deprecated Use `@financialadvisor/ledger` directly. Re-exports all ledger types and services. */
export * from '@financialadvisor/ledger';
/** @deprecated Use `@financialadvisor/ingestion` directly. Re-exports all ingestion importers and stores. */
export * from '@financialadvisor/ingestion';

// Version information
/** Package version string. */
export const VERSION = '1.0.0';
/** Package name identifier. */
export const PACKAGE_NAME = '@financialadvisor/shared';
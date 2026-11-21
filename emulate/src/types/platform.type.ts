/**
 * Target platforms the emulate service can capture traffic from.
 * 'android' is legacy: no longer assigned to new targets, but still accepted
 * for existing rows and mobile capture.
 */

export type TargetPlatform = 'website' | 'application' | 'terminal';

export type Platform = TargetPlatform | 'android';
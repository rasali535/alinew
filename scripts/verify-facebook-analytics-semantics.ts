import { formatAnalyticsMetric, AnalyticsSource, MetricState } from '../apps/ralion/src/lib/services/social/facebookAnalyticsSemantics';

function assert(condition: boolean, testId: string, desc: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${testId}: ${desc}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] ${testId}: ${desc}`);
  }
}

console.log('=================================================================');
console.log('FACEBOOK ANALYTICS SEMANTICS HARDENING VALIDATION');
console.log('=================================================================\n');

// 1. Numeric metric returned by Meta as 0 -> display 0
const metaZeroTest = formatAnalyticsMetric({
  rawNumericValue: 0,
  hasMetaNumeric: true,
});
assert(
  metaZeroTest.displayValue === '0' &&
  metaZeroTest.source === 'META_LIVE' &&
  metaZeroTest.state === 'ZERO',
  'SEM-01',
  'Numeric metric returned by Meta as 0 displays "0" with source META_LIVE'
);

// 2. Numeric metric returned by Meta with positive value
const metaPositiveTest = formatAnalyticsMetric({
  rawNumericValue: 108,
  hasMetaNumeric: true,
});
assert(
  metaPositiveTest.displayValue === '108' &&
  metaPositiveTest.source === 'META_LIVE' &&
  metaPositiveTest.state === 'AVAILABLE',
  'SEM-02',
  'Numeric metric returned by Meta with positive value displays exact formatted count with source META_LIVE'
);

// 3. HTTP 200 with empty data / metric absent -> display "Data Unavailable", not automatically 0
const metaAbsentTest = formatAnalyticsMetric({
  rawNumericValue: null,
  isMetaAbsent: true,
});
assert(
  metaAbsentTest.displayValue === 'Data Unavailable' &&
  metaAbsentTest.source === 'UNAVAILABLE' &&
  metaAbsentTest.state === 'DATA_UNAVAILABLE',
  'SEM-03',
  'HTTP 200 with empty data / metric absent displays "Data Unavailable" (not automatically 0) with source UNAVAILABLE'
);

// 4. OAuth permission error -> display "Permission Required"
const permissionErrorTest = formatAnalyticsMetric({
  isPermissionError: true,
  permissionName: 'pages_read_engagement',
});
assert(
  permissionErrorTest.displayValue === 'Permission Required' &&
  permissionErrorTest.source === 'UNAVAILABLE' &&
  permissionErrorTest.state === 'PERMISSION_REQUIRED' &&
  permissionErrorTest.permissionRequired === 'pages_read_engagement',
  'SEM-04',
  'OAuth permission error displays "Permission Required" with source UNAVAILABLE'
);

// 5. Local Ralion post inventory only -> label "Ralion-tracked"
const ralionTrackedTest = formatAnalyticsMetric({
  rawNumericValue: 10,
  isRalionTracked: true,
});
assert(
  ralionTrackedTest.displayValue === '10' &&
  ralionTrackedTest.source === 'RALION_TRACKED' &&
  ralionTrackedTest.badgeText === '🔷 RALION_TRACKED',
  'SEM-05',
  'Local Ralion post inventory only displays value labeled with source RALION_TRACKED'
);

// 6. Derived metrics (e.g. Mari AI score) -> label "DERIVED"
const derivedTest = formatAnalyticsMetric({
  rawNumericValue: 84,
  fallbackFormatted: '84/100',
  isDerived: true,
});
assert(
  derivedTest.displayValue === '84/100' &&
  derivedTest.source === 'DERIVED' &&
  derivedTest.badgeText === '✨ DERIVED',
  'SEM-06',
  'Algorithmic / calculated metrics labeled with source DERIVED'
);

console.log('\n=================================================================');
console.log('ALL FACEBOOK ANALYTICS SEMANTICS TESTS PASSED SUCCESSFULLY!');
console.log('=================================================================');

import { describe, expect, it } from 'vitest';

describe('PayPal subscription custom_id', () => {
  it('keeps a canonical UUID organization reference below PayPal\'s 127 character limit', () => {
    const organizationId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
    const customId = JSON.stringify({ organizationId });

    expect(customId.length).toBeLessThanOrEqual(127);
    expect(JSON.parse(customId)).toEqual({ organizationId });
  });
});

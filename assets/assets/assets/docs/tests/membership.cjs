const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    const errors = [];

    page.on('pageerror', error => errors.push(error.message));

    await page.route(
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
      route => route.fulfill({
        contentType: 'text/javascript',
        body: `
          window.calls = [];
          let listener;
          let session = null;
          window.failLogin = false;

          window.supabase = {
            createClient: () => ({
              auth: {
                getSession: async () => ({
                  data: { session }
                }),

                onAuthStateChange: fn => {
                  listener = fn;
                },

                signUp: async input => {
                  calls.push(['signup', input]);
                  return { data: {}, error: null };
                },

                signInWithPassword: async input => {
                  calls.push(['login', input]);

                  if (window.failLogin) {
                    return {
                      error: { message: 'raw private error' }
                    };
                  }

                  session = {
                    user: {
                      email: input.email,
                      email_confirmed_at: '2026-01-01'
                    }
                  };

                  listener('SIGNED_IN', session);

                  return { error: null };
                },

                resetPasswordForEmail: async (...input) => {
                  calls.push(['reset', ...input]);
                  return { error: null };
                },

                updateUser: async input => {
                  calls.push(['password', input]);
                  return { error: null };
                },

                signOut: async () => {
                  session = null;
                  listener('SIGNED_OUT', null);
                  return { error: null };
                }
              }
            })
          };
        `
      })
    );

    const base =
      process.env.HUB_BASE_URL || 'http://127.0.0.1:8040';

    await page.goto(base + '/membership.html');

    await page.waitForFunction(
      () => !document.querySelector('#member-forms').hidden
    );

    await page.locator('#signup-name').fill('Test Member');
    await page.locator('#signup-email').fill('test@example.org');
    await page.locator('#signup-password').fill('test-password-123');

    await page.locator('#member-signup button').click();

    assert.equal(
      await page.evaluate(() => calls.length),
      0
    );

    await page.locator('#signup-consent').check();
    await page.locator('#member-signup button').click();

    await page.waitForFunction(
      () => document.querySelector('#member-status')
        .textContent.includes('Check your email')
    );

    const signup = await page.evaluate(() => calls[0]);

    assert.equal(
      signup[1].options.data.full_name,
      'Test Member'
    );

    assert(
      signup[1].options.emailRedirectTo.endsWith('/membership.html')
    );

    assert.equal(
      await page.locator('#signup-password').inputValue(),
      ''
    );

    assert(
      await page.locator('#member-account').isHidden()
    );

    await page.locator('#login-email').fill('test@example.org');
    await page.locator('#login-password').fill('test-password-123');

    await page.evaluate(() => {
      window.failLogin = true;
    });

    await page.locator('#member-login button').click();

    await page.waitForFunction(
      () => document.querySelector('#member-status')
        .textContent.includes('Sign-in failed')
    );

    assert(
      !(await page.locator('body').textContent())
        .includes('raw private error')
    );

    await page.locator('#login-password').fill('test-password-123');

    await page.evaluate(() => {
      window.failLogin = false;
    });

    await page.locator('#member-login button').click();

    await page.waitForFunction(
      () => !document.querySelector('#member-account').hidden
    );

    assert(
      (await page.locator('#member-identity').textContent())
        .includes('test@example.org')
    );

    await page.locator('#member-signout').click();

    await page.waitForFunction(
      () => !document.querySelector('#member-forms').hidden
    );

    await page.locator('#reset-email').fill('test@example.org');
    await page.locator('#member-reset button').click();

    await page.waitForFunction(
      () => document.querySelector('#member-status')
        .textContent.includes('If an account exists')
    );

    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({
        width,
        height: 900
      });

      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      );
    }

    await page.goto(
      base + '/membership.html#type=recovery'
    );

    await page.reload();

    await page.waitForFunction(
      () => !document.querySelector('#member-recovery').hidden
    );

    await page.locator('#new-password').fill('new-password-1234');
    await page.locator('#member-password button').click();

    await page.waitForFunction(
      () => document.querySelector('#member-status')
        .textContent.includes('password has been updated')
    );

    assert.equal(
      errors.length,
      0,
      errors.join('\n')
    );

    console.log(
      'Membership consent, signup redirect, password clearing, ' +
      'login failure/success, sign-out, reset/recovery and ' +
      'responsive layouts pass with simulated Auth responses.'
    );
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

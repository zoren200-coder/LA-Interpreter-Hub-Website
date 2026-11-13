(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const status = $('member-status');
  const config = window.HUB_SUPABASE_DIRECTORY;

  if (!config || !window.supabase?.createClient) {
    status.textContent =
      'Membership service unavailable. Please reload and try again.';
    return;
  }

  // Authentication is separate from the public directory's nonpersistent client.
  const client = window.supabase.createClient(
    config.url,
    config.publishableKey
  );

  const redirect = new URL('membership.html', location.href).href;

  const signupMode = new URLSearchParams(location.search).get("mode") === "signup";
  let signupFocused = false;

  let recovery =
    new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';

  const callbackError =
    new URLSearchParams(location.hash.slice(1)).has('error');

  function render(session) {
    const member = !!session?.user?.email_confirmed_at;

    $('member-forms').hidden = member || recovery;
    $('member-account').hidden = !member || recovery;
    $('member-recovery').hidden = !recovery;
    $('member-login-panel').hidden = signupMode;
    $('member-signin-link').hidden = !signupMode;
    $('member-forms').classList.toggle('signup-mode', signupMode);

    if (signupMode && !member && !recovery && !signupFocused) {
      signupFocused = true;
      requestAnimationFrame(() => {
        $('member-signup-panel').scrollIntoView({ block: 'start', behavior: 'instant' });
        $('signup-name').focus({ preventScroll: true });
      });
    }

    $('member-identity').textContent = member
      ? 'Signed in as ' + session.user.email
      : '';

    status.textContent = recovery
      ? 'Set a new password below.'
      : member
        ? 'You are signed in as a Hub member.'
        : callbackError
          ? 'This email link could not be used. Request a new confirmation or password reset email.'
          : 'Register below, or sign in to your membership account.';
  }

  const messages = {
    signup:
      'Registration could not be completed. Check your details or try signing in if you already have an account.',
    login:
      'Sign-in failed. Check your email and password, and confirm your email before signing in.',
    reset:
      'The reset email could not be sent. Please wait and try again.',
    password:
      'Your password could not be updated. Request a new reset email and try again.',
    signout:
      'Sign-out failed. Please try again.'
  };

  async function run(form, kind, action, success) {
    const buttons = form.querySelectorAll('button');

    buttons.forEach(button => {
      button.disabled = true;
    });

    status.textContent = 'Please wait…';

    try {
      const result = await action();

      if (result.error) {
        throw result.error;
      }

      form.reset?.();
      status.textContent = success;
    } catch {
      status.textContent = messages[kind];
    } finally {
      buttons.forEach(button => {
        button.disabled = false;
      });
    }
  }

  $('member-signup').addEventListener('submit', event => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const email = $('signup-email').value.trim();
    const password = $('signup-password').value;
    const name = $('signup-name').value.trim();

    if (!name) {
      status.textContent = 'Enter your professional name.';
      return;
    }

    run(
      form,
      'signup',
      () => client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirect,
          data: {
            full_name: name,
            membership_consent_at: new Date().toISOString()
          }
        }
      }),
      'Check your email for a confirmation link to complete membership registration. If you already have an account, sign in or reset your password.'
    );
  });

  $('member-login').addEventListener('submit', event => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    run(
      form,
      'login',
      () => client.auth.signInWithPassword({
        email: $('login-email').value.trim(),
        password: $('login-password').value
      }),
      'You are signed in.'
    );
  });

  $('member-reset').addEventListener('submit', event => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    run(
      form,
      'reset',
      () => client.auth.resetPasswordForEmail(
        $('reset-email').value.trim(),
        { redirectTo: redirect }
      ),
      'If an account exists for this email, check your inbox for a password reset link.'
    );
  });

  $('member-password').addEventListener('submit', event => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    run(
      form,
      'password',
      async () => {
        const result = await client.auth.updateUser({
          password: $('new-password').value
        });

        if (!result.error) {
          recovery = false;

          const { data } = await client.auth.getSession();

          render(data.session);
        }

        return result;
      },
      'Your password has been updated.'
    );
  });

  $('member-signout').addEventListener('click', () => {
    run(
      $('member-account'),
      'signout',
      () => client.auth.signOut(),
      'You have been signed out.'
    );
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovery = true;
    }

    if (event === 'SIGNED_OUT') {
      recovery = false;
    }

    render(session);
  });

  client.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        throw error;
      }

      render(data.session);
    })
    .catch(() => {
      status.textContent =
        'Membership service unavailable. Please reload and try again.';
    });

  $('year').textContent = new Date().getFullYear();
})();

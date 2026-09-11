# Login preview

The login gate sits before staff views; public registration and status lookup remain accessible. `/#/login` is the standalone entry screen. Staff deep links show the gate and continue to the requested screen after entry. Refresh resets the in-memory gate along with the existing mock state.

Any username/email and password work, including empty values. The form uses `noValidate`, a text username input, and no required fields. Credentials are never read, stored, checked or sent. Password visibility is a display control only. No auth provider, login errors, rate limits or backend were added.

The success state changes the action to a welcome message with a short progress line, then fades into the workspace and moves keyboard focus to its main content. Reduced-motion users get an abbreviated transition without animation.

## Visual direction

A dark architectural panel gives the PLU logo a strong anchor. Yellow light follows curved surfaces, with a fine red reflection. The cream form panel preserves the dashboard's typography and makes inputs easy to read. The image is decorative and carries no essential content; mobile uses a shorter art header above the full-width form.

Generated with the built-in image generation tool; copied into `public/brand/login-atmosphere.png`. Existing PLU logo retained unchanged. Components and styles are isolated in `src/Login.jsx` and `src/login.css`.

## Generation prompt

Use case: stylized-concept. Create a premium abstract architectural light artwork for the left panel of a civic platform login screen. Portrait 1024x1536 composition. Dominant near-black #050505 matte background, sculptural sweeping concentric curved surfaces emerging from the lower right, a luminous restrained yellow #fff200 rim of light, one fine deep red #e30613 reflected edge. Abstract folded planes and radial arcs, subtly tactile paper/metal grain, softly illuminated black-on-black depth. Upper 45 percent mostly empty black negative space for separate HTML typography; strongest visual in lower half. Intriguing, assured, professional, quiet monumental quality. Restrained Ugandan flag palette, not literal stripes. No people, flags, political figures, text, letters, logos, symbols, watermarks, UI, or typography. Deliver only the background artwork.

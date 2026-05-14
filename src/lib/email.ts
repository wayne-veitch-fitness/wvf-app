export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://wvf-app.vercel.app')
)

export async function sendEmail({
  to, subject, html,
}: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return
  }
  const from = process.env.RESEND_FROM || 'WVF App <noreply@mail.wvfitness.com.au>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
}

export function welcomeEmailHtml({
  firstName,
  email,
  password,
  appUrl,
}: {
  firstName: string
  email: string
  password: string
  appUrl: string
}) {
  const feature = (emoji: string, title: string, description: string) => `
    <tr>
      <td style="padding:0 0 20px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="width:44px;vertical-align:top;padding-top:2px;">
              <div style="width:36px;height:36px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;text-align:center;line-height:36px;">
                ${emoji}
              </div>
            </td>
            <td style="vertical-align:top;padding-left:12px;">
              <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:3px;">${title}</div>
              <div style="font-size:13px;color:#6b7280;line-height:1.5;">${description}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  const body = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">
      Hey ${firstName}, welcome to WVF! 🎉
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Wayne has set up your account and you're all ready to go.
      Here's everything you need to get started.
    </p>

    <!-- Login credentials -->
    <div style="background:#20243D;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.5);margin-bottom:12px;">
        Your login details
      </div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
        <tr>
          <td style="width:72px;font-size:12px;color:rgba(255,255,255,0.5);padding-bottom:6px;">Email</td>
          <td style="font-size:14px;font-weight:600;color:white;padding-bottom:6px;">${email}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:rgba(255,255,255,0.5);">Password</td>
          <td style="font-size:14px;font-weight:600;color:white;font-family:monospace,monospace;">${password}</td>
        </tr>
      </table>
      <a href="${appUrl}" style="display:block;background:white;color:#20243D;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Open the app →
      </a>
    </div>

    <!-- Divider -->
    <div style="border-top:1px solid #e5e7eb;margin-bottom:24px;"></div>

    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:20px;">
      Your app, at a glance
    </div>

    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${feature('📋', 'Your Program', "Your personalised training plan, built by Wayne. Each exercise includes a video demo so you know exactly what to do and how to do it.")}
      ${feature('💪', 'Log Your Workouts', "When you start a session, the app walks you through each exercise. Log your weights and reps as you go — it automatically records personal bests and shows what you lifted last time so you always have a target.")}
      ${feature('✅', 'Weekly Check-in', "Each week, rate how you're going across sleep, nutrition, energy, stress, and more. Log your weight and leave Wayne a note. He'll review everything and reply with his feedback.")}
      ${feature('🍽️', 'Food Diary', "A quick daily log for breakfast, lunch, dinner, and snacks. Wayne can see it alongside your check-in to get the full picture of how your week is tracking.")}
      ${feature('📈', 'Progress', "Your weight trend over time, all your personal bests in one place, and your wellness scores from check-ins. A great way to see just how far you've come.")}
      ${feature('📚', 'Resources', "Guides, recipes, and educational content from Wayne — everything you need to support your training, all in one place.")}
    </table>

    <!-- Divider -->
    <div style="border-top:1px solid #e5e7eb;margin:8px 0 20px;"></div>

    <!-- Password tip -->
    <div style="background:#f9fafb;border-radius:8px;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
        <strong style="color:#374151;">First time in?</strong>
        Once you've logged in, go to <strong style="color:#374151;">More → Change password</strong> to set your own password.
      </p>
    </div>`

  return emailWrapper(body)
}

export function emailWrapper(body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">
    <div style="background:#20243D;padding:20px 24px;border-radius:12px 12px 0 0;">
      <span style="color:white;font-size:16px;font-weight:700;letter-spacing:0.02em;">Wayne Veitch Fitness</span>
    </div>
    <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 12px 12px;">
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0;">
      WVF Client App &nbsp;·&nbsp; This is an automated notification
    </p>
  </div>
</body>
</html>`
}

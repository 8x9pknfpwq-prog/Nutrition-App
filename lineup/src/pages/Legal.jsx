import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NYCLinesLogo from '../components/NYCLinesLogo.jsx';

// Update this to your real support address before launch.
const CONTACT = 'support@nyclines.app';
const EFFECTIVE = 'June 2026';

function P({ children }) {
  return <p className="mt-3 text-sm leading-relaxed text-gray-600">{children}</p>;
}
function H({ children }) {
  return <h2 className="mt-7 text-base font-bold text-ink">{children}</h2>;
}

function Privacy() {
  return (
    <>
      <P>
        NYC Lines (“we”, “us”) is a crowd-sourced map of bar wait times in New York City. This policy
        explains what we collect and why. It applies to the NYC Lines web app.
      </P>

      <H>What we collect</H>
      <P>
        <strong>Account info:</strong> your first and last name, email address, and a username, which you
        provide when you sign up, plus a phone number if you choose to add one (optional). Passwords are
        stored only as salted hashes by our authentication provider — we never see them.
      </P>
      <P>
        <strong>Your contributions:</strong> the wait-time reports and place suggestions you submit,
        along with the time you submitted them. These power the live waits and busyness forecasts everyone
        sees.
      </P>
      <P>
        <strong>Approximate location:</strong> if you tap “locate me,” your device shares your coordinates
        with the app to center the map and sort bars by distance. This happens in your browser and is not
        stored on our servers.
      </P>

      <H>How we use it</H>
      <P>
        To run the service: showing live and forecasted wait times, letting you check in, connecting you
        with friends you add, and keeping the map accurate. We do not sell your personal information.
      </P>

      <H>Service providers</H>
      <P>
        We use Supabase (authentication and database hosting) and Mapbox (maps and geocoding). Your data
        is processed by these providers solely to operate NYC Lines. Map tiles and address lookups send
        the relevant query to Mapbox.
      </P>

      <H>Sharing &amp; visibility</H>
      <P>
        Your username and check-ins are visible to friends you connect with. Aggregated, anonymized
        wait-time data (the numbers on the map and the forecasts) is visible to everyone, but is not tied
        to your identity.
      </P>
      <P>
        <strong>Finding friends:</strong> if you add a phone number, someone who already has your full
        number can use it to find your account and send you a friend request. Your phone number itself is
        never shown to other users, and we do not upload or scan your device’s contacts.
      </P>

      <H>Your choices</H>
      <P>
        You can stop sharing location at any time in your browser settings. To delete your account and
        associated data, contact us at {CONTACT}.
      </P>

      <H>Children</H>
      <P>NYC Lines is intended for adults of legal drinking age and is not directed at children under 13.</P>

      <H>Changes</H>
      <P>We may update this policy; material changes will be reflected by the effective date above.</P>

      <H>Contact</H>
      <P>Questions? Email {CONTACT}.</P>
    </>
  );
}

function Terms() {
  return (
    <>
      <P>
        These terms govern your use of NYC Lines. By creating an account or using the app, you agree to
        them.
      </P>

      <H>The service</H>
      <P>
        NYC Lines shows crowd-sourced and forecasted bar wait times. Wait times are estimates contributed
        by users and our model — they may be inaccurate or out of date. Use your own judgment; we are not
        responsible for decisions you make based on them.
      </P>

      <H>Your account</H>
      <P>
        You’re responsible for keeping your login secure and for activity under your account. Provide
        accurate information and don’t impersonate others.
      </P>

      <H>Acceptable use</H>
      <P>
        Don’t submit false or spammy reports, suggest places that don’t exist, harass other users, scrape
        the service, or attempt to disrupt it. We may remove content or suspend accounts that violate
        these terms.
      </P>

      <H>Objectionable content &amp; abuse</H>
      <P>
        There is zero tolerance for objectionable content or abusive users. You can report a place from
        its detail sheet and block any user from the Friends screen. We review reported content and remove
        it — and eject repeat offenders — within 24 hours. Reports and blocks are acted on without notice.
      </P>

      <H>Your content</H>
      <P>
        You keep ownership of what you submit, but grant us a license to display and use it to operate and
        improve NYC Lines (including in aggregated, anonymized form).
      </P>

      <H>Drink responsibly</H>
      <P>
        NYC Lines is for entertainment and convenience. Please drink responsibly and never drink and
        drive.
      </P>

      <H>Disclaimers &amp; liability</H>
      <P>
        The service is provided “as is,” without warranties. To the fullest extent permitted by law, we
        are not liable for any indirect or consequential damages arising from your use of NYC Lines.
      </P>

      <H>Changes &amp; contact</H>
      <P>
        We may update these terms; continued use means you accept the changes. Questions? Email {CONTACT}.
      </P>
    </>
  );
}

export default function Legal({ doc }) {
  const isPrivacy = doc === 'privacy';
  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto overscroll-contain bg-canvas px-5 pb-20 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-gray-500">
          <ArrowLeft size={18} /> Back
        </Link>
        <NYCLinesLogo variant="light" height={28} />
      </div>

      <h1 className="mt-6 text-2xl font-extrabold text-ink">
        {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
      </h1>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Effective {EFFECTIVE}
      </p>

      <div className="mt-2">{isPrivacy ? <Privacy /> : <Terms />}</div>

      <div className="mt-10 border-t border-black/10 pt-4 text-sm">
        <Link to={isPrivacy ? '/terms' : '/privacy'} className="font-semibold text-ink">
          {isPrivacy ? 'Read our Terms of Service →' : 'Read our Privacy Policy →'}
        </Link>
      </div>
    </div>
  );
}

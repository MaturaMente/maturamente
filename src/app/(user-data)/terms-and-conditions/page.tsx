import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termini e Condizioni",
  description:
    "Termini e condizioni d'uso di MaturaMate. Leggi le regole e le condizioni per l'utilizzo della piattaforma di preparazione alla maturità scientifica.",
  keywords: [
    "termini e condizioni",
    "condizioni d'uso",
    "regolamento piattaforma",
    "terms of service",
    "condizioni utilizzo MaturaMate",
  ],
  openGraph: {
    title: "Termini e Condizioni | MaturaMate",
    description:
      "Termini e condizioni d'uso di MaturaMate. Regole per l'utilizzo della piattaforma educativa.",
    url: "/terms-and-conditions",
  },
  twitter: {
    title: "Termini e Condizioni | MaturaMate",
    description: "Termini e condizioni d'uso della piattaforma MaturaMate.",
  },
  alternates: {
    canonical: "/terms-and-conditions",
  },
  robots: {
    index: true,
    follow: false,
  },
};

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Terms and Conditions
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: 24/05/2025
          </p>
        </div>

        <div className="space-y-4 text-muted-foreground">
          <p className="text-lg">
            We are Maturamate ("Company," "we," "us," "our"), a company
            registered in Italy at Via Leopoldo Ruspoli, 00149. We operate the
            website http://www.maturamate.it (the "Site"), as well as any other
            related products and services that refer or link to these legal
            terms (the "Legal Terms") (collectively, the "Services").
          </p>
          <p>
            MaturaMate is a digital platform designed specifically to support
            students in preparing for the mathematics portion of the State Exam.
            The site integrates various educational components into a single
            digital solution:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              An organized collection of theoretical content, enriched with
              practical examples
            </li>
            <li>
              A comprehensive database of exercises categorized by topic and
              difficulty level
            </li>
            <li>
              Exam simulations based on previous years' tests, from 2001 to the
              most recent in 2024, including ordinary, supplementary, and
              extraordinary tests
            </li>
            <li>
              An AI-powered digital assistant capable of providing personalized
              explanations
            </li>
          </ul>
          <p>
            You can contact us by email at{" "}
            <a
              href="mailto:maturamate.help@gmail.com"
              className="text-primary underline hover:text-primary/80"
            >
              maturamate.help@gmail.com
            </a>{" "}
            or by mail to Italy.
          </p>
          <p>
            These Legal Terms constitute a legally binding agreement made
            between you, whether personally or on behalf of an entity ("you"),
            and Maturamate, concerning your access to and use of the Services.
            You agree that by accessing the Services, you have read, understood,
            and agreed to be bound by all of these Legal Terms.
          </p>
          <p className="text-base font-semibold">
            IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE
            EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST
            DISCONTINUE USE IMMEDIATELY.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            1. OUR SERVICES
          </h2>
          <p className="text-muted-foreground">
            The information provided when using the Services is not intended for
            distribution to or use by any person or entity in any jurisdiction
            or country where such distribution or use would be contrary to law
            or regulation or which would subject us to any registration
            requirement within such jurisdiction or country. Accordingly, those
            persons who choose to access the Services from other locations do so
            on their own initiative and are solely responsible for compliance
            with local laws, if and to the extent local laws are applicable.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            2. INTELLECTUAL PROPERTY RIGHTS
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Our intellectual property</h3>
              <p className="text-muted-foreground">
                We are the owner or the licensee of all intellectual property
                rights in our Services, including all source code, databases,
                functionality, software, website designs, audio, video, text,
                photographs, and graphics in the Services (collectively, the
                "Content"), as well as the trademarks, service marks, and logos
                contained therein (the "Marks"). Our Content and Marks are
                protected by copyright and trademark laws (and various other
                intellectual property rights and unfair competition laws) and
                treaties around the world. The Content and Marks are provided in
                or through the Services "AS IS" for your personal,
                non-commercial use only.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-medium">Your use of our Services</h3>
              <p className="text-muted-foreground">
                Subject to your compliance with these Legal Terms, Including the
                "PROHIBITED ACTIVITIES" section below, we grant you a
                non-exclusive, non-transferable, revocable license to:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>access the Services; and</li>
                <li>
                  download or print a copy of any portion of the Content to
                  which you have properly gained access, solely for your
                  personal, non-commercial use.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            3. USER REPRESENTATIONS
          </h2>
          <p className="text-muted-foreground">
            By using the Services, you represent and warrant that:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              all registration information you submit will be true, accurate,
              current, and complete;
            </li>
            <li>
              you will maintain the accuracy of such information and promptly
              update such registration information as necessary;
            </li>
            <li>
              you have the legal capacity and you agree to comply with these
              Legal Terms;
            </li>
            <li>you are not under the age of 13;</li>
            <li>
              you are not a minor in the jurisdiction in which you reside, or if
              a minor, you have received parental permission to use the
              Services;
            </li>
            <li>
              you will not access the Services through automated or non-human
              means, whether through a bot, script or otherwise;
            </li>
            <li>
              you will not use the Services for any illegal or unauthorized
              purpose;
            </li>
            <li>
              your use of the Services will not violate any applicable law or
              regulation.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            4. USER REGISTRATION
          </h2>
          <p className="text-muted-foreground">
            You may be required to register to use the Services. You agree to
            keep your password confidential and will be responsible for all use
            of your account and password. We reserve the right to remove,
            reclaim, or change a username you select if we determine, in our
            sole discretion, that such username is inappropriate, obscene, or
            otherwise objectionable.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            6. PROHIBITED ACTIVITIES
          </h2>
          <p className="text-muted-foreground">
            You may not access or use the Services for any purpose other than
            that for which we make the Services available. The Services may not
            be used in connection with any commercial endeavors except those
            that are specifically endorsed or approved by us.
          </p>
          <p className="text-muted-foreground">
            As a user of the Services, you agree not to:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              Systematically retrieve data or other content from the Services to
              create or compile, directly or indirectly, a collection,
              compilation, database, or directory without written permission
              from us.
            </li>
            <li>
              Trick, defraud, or mislead us and other users, especially in any
              attempt to learn sensitive account information such as user
              passwords.
            </li>
            <li>
              Circumvent, disable, or otherwise interfere with security-related
              features of the Services, including features that prevent or
              restrict the use or copying of any Content or enforce limitations
              on the use of the Services and/or the Content contained therein.
            </li>
            <li>
              Disparage, tarnish, or otherwise harm, in our opinion, us and/or
              the Services.
            </li>
            <li>
              Use any information obtained from the Services in order to harass,
              abuse, or harm another person.
            </li>
            <li>
              Make improper use of our support services or submit false reports
              of abuse or misconduct.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            7. USER GENERATED CONTRIBUTIONS
          </h2>
          <p className="text-muted-foreground">
            The Services does not offer users to submit or post content. We may
            provide you with the opportunity to create, submit, post, display,
            transmit, perform, publish, distribute, or broadcast content and
            materials to us or on the Services, including but not limited to
            text, writings, video, audio, photographs, graphics, comments,
            suggestions, or personal information or other material
            (collectively, "Contributions").
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            8. CONTRIBUTION LICENSE
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              You and Services agree that we may access, store, process, and use
              any information and personal data that you provide following the
              terms of the Privacy Policy and your choices (including settings).
            </p>
            <p>
              By submitting suggestions or other feedback regarding the
              Services, you agree that we can use and share such feedback for
              any purpose without compensation to you.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            9. THIRD-PARTY WEBSITES AND CONTENT
          </h2>
          <p className="text-muted-foreground">
            The Services may contain (or you may be sent via the Site) links to
            other websites ("Third-Party Websites") as well as articles,
            photographs, text, graphics, pictures, designs, music, sound, video,
            information, applications, software, and other content or items
            belonging to or originating from third parties ("Third-Party
            Content").
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            10. SERVICES MANAGEMENT
          </h2>
          <p className="text-muted-foreground">
            We reserve the right, but not the obligation, to: (1) monitor the
            Services for violations of these Legal Terms; (2) take appropriate
            legal action against anyone who, in our sole discretion, violates
            the law or these Legal Terms, including without limitation,
            reporting such user to law enforcement authorities; (3) in our sole
            discretion and without limitation, refuse, restrict access to, limit
            the availability of, or disable (to the extent technologically
            feasible) any of your Contributions or any portion thereof; (4) in
            our sole discretion and without limitation, notice, or liability, to
            remove from the Services or otherwise disable all files and content
            that are excessive in size or are in any way burdensome to our
            systems; and (5) otherwise manage the Services in a manner designed
            to protect our rights and property and to facilitate the proper
            functioning of the Services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            11. PRIVACY POLICY
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              We care about data privacy and security. Please review our Privacy
              Policy:{" "}
              <a
                href="https://maturamate.it/privacy-policy"
                className="text-primary underline hover:text-primary/80"
              >
                https://maturamate.it/privacy-policy
              </a>
              . By using the Services, you agree to be bound by our Privacy
              Policy, which is incorporated into these Legal Terms.
            </p>
            <p>
              Please be advised the Services are hosted in the United States and
              Italy. If you access the Services from any other region of the
              world with laws or other requirements governing personal data
              collection, use, or disclosure that differ from applicable laws in
              the United States and Italy, then through your continued use of
              the Services, you are transferring your data to the United States
              and Italy, and you expressly consent to have your data transferred
              to and processed in the United States and Italy.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            12. TERM AND TERMINATION
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              These Legal Terms shall remain in full force and effect while you
              use the Services.
            </p>
            <p className="font-medium">
              WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE
              RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR
              LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING
              BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR
              FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY
              REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL
              TERMS OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE
              YOUR USE OR PARTICIPATION IN THE SERVICES OR DELETE YOUR ACCOUNT
              AND ANY CONTENT OR INFORMATION THAT YOU POSTED AT ANY TIME,
              WITHOUT WARNING, IN OUR SOLE DISCRETION.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            13. MODIFICATIONS AND INTERRUPTIONS
          </h2>
          <p className="text-muted-foreground">
            We reserve the right to change, modify, or remove the contents of
            the Services at any time or for any reason at our sole discretion
            without notice. However, we have no obligation to update any
            information on our Services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            14. GOVERNING LAW
          </h2>
          <p className="text-muted-foreground">
            These Legal Terms are governed by and interpreted following the laws
            of Italy, and the use of the United Nations Convention of Contracts
            for the International Sales of Goods is expressly excluded. If your
            habitual residence is in the EU, and you are a consumer, you
            additionally possess the protection provided to you by obligatory
            provisions of the law in your country to residence. Maturamate and
            yourself both agree to submit to the non-exclusive jurisdiction of
            the courts of Roma, which means that you may make a claim to defend
            your consumer protection rights in regards to these Legal Terms in
            Italy, or in the EU country in which you reside.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            15. DISPUTE RESOLUTION
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Informal Negotiations</h3>
              <p className="text-muted-foreground">
                To expedite resolution and control the cost of any dispute,
                controversy, or claim related to these Legal Terms (each a
                "Dispute" and collectively, the "Disputes") brought by either
                you or us (individually, a "Party" and collectively, the
                "Parties"), the Parties agree to first attempt to negotiate any
                Dispute (except those Disputes expressly provided below)
                informally for at least three hundred sixty five (365) days
                before initiating arbitration. Such informal negotiations
                commence upon written notice from one Party to the other Party.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            16. CORRECTIONS
          </h2>
          <p className="text-muted-foreground">
            There may be information on the Services that contains typographical
            errors, inaccuracies, or omissions, including descriptions, pricing,
            availability, and various other information. We reserve the right to
            correct any errors, inaccuracies, or omissions and to change or
            update the information on the Services at any time, without prior
            notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            17. DISCLAIMER
          </h2>
          <p className="text-muted-foreground font-medium">
            THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU
            AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO
            THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES,
            EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE
            THEREOF.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            18. LIMITATIONS OF LIABILITY
          </h2>
          <p className="text-muted-foreground font-medium">
            IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE
            TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL,
            EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST
            PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM
            YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE
            POSSIBILITY OF SUCH DAMAGES.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            19. INDEMNIFICATION
          </h2>
          <p className="text-muted-foreground">
            You agree to defend, indemnify, and hold us harmless, including our
            subsidiaries, affiliates, and all of our respective officers,
            agents, partners, and employees, from and against any loss, damage,
            liability, claim, or demand, including reasonable attorneys' fees
            and expenses, made by any third party due to or arising out of: (1)
            use of the Services; (2) breach of these Legal Terms; (3) any breach
            of your representations and warranties set forth in these Legal
            Terms; (4) your violation of the rights of a third party, including
            but not limited to intellectual property rights; or (5) any overt
            harmful act toward any other user of the Services with whom you
            connected via the Services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            20. USER DATA
          </h2>
          <p className="text-muted-foreground">
            We will maintain certain data that you transmit to the Services for
            the purpose of managing the performance of the Services, as well as
            data relating to your use of the Services. Although we perform
            regular routine backups of data, you are solely responsible for all
            data that you transmit or that relates to any activity you have
            undertaken using the Services. You agree that we shall have no
            liability to you for any loss or corruption of any such data, and
            you hereby waive any right of action against us arising from any
            such loss or corruption of such data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            21. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES
          </h2>
          <p className="text-muted-foreground">
            Visiting the Services, sending us emails, and completing online
            forms constitute electronic communications. You consent to receive
            electronic communications, and you agree that all agreements,
            notices, disclosures, and other communications we provide to you
            electronically, via email and on the Services, satisfy any legal
            requirement that such communication be in writing.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            22. MISCELLANEOUS
          </h2>
          <p className="text-muted-foreground">
            These Legal Terms and any policies or operating rules posted by us
            on the Services or in respect to the Services constitute the entire
            agreement and understanding between you and us. Our failure to
            exercise or enforce any right or provision of these Legal Terms
            shall not operate as a waiver of such right or provision.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            23. CONTACT US
          </h2>
          <div className="space-y-2 text-muted-foreground">
            <p>
              In order to resolve a complaint regarding the Services or to
              receive further information regarding use of the Services, please
              contact us at:
            </p>
            <p className="font-medium">Maturamate</p>
            <p>Italy</p>
            <p className="text-primary">
              <a
                href="mailto:maturamate.help@gmail.com"
                className="underline hover:text-primary/80"
              >
                maturamate.help@gmail.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

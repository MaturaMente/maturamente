import { Resend } from "resend";
import { generateUnsubscribeToken } from "./unsubscribe";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function send100thEmail(email: string, name: string) {
  const token = generateUnsubscribeToken(email);
  const unsubscribeUrl = `https://maturamate.it/unsubscribe?email=${encodeURIComponent(
    email
  )}&token=${token}`;

  return resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: email,
    subject: "Grazie di cuore da Maturamate! 💙",
    html: `
      <!DOCTYPE html>
      <html lang="it" dir="ltr" style="color-scheme: light dark; supported-color-schemes: light dark;">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <title>Grazie di cuore da Maturamate!</title>
        <style>
          
          /* Base styles */
          body {
            width: 100% !important;
            height: 100%;
            margin: 0;
            -webkit-text-size-adjust: none;
            font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
          }
          
          a {
            color: #2563eb;
            text-decoration: none;
          }
          
          a:hover {
            text-decoration: underline;
          }
          
          .email-wrapper {
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          
          .email-content {
            width: 100%;
            margin: 0;
            padding: 20px 0;
          }
          
          .email-body {
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .email-body_inner {
            width: 600px;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          /* Header with brand colors */
          .email-header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
          }
          
          .email-header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          
          .email-header .emoji {
            font-size: 32px;
            margin-bottom: 8px;
            display: block;
          }
          
          /* Content area */
          .content-cell {
            padding: 40px 30px;
          }
          
          h2 {
            margin: 0 0 20px 0;
            color: #1e293b;
            font-size: 22px;
            font-weight: 600;
            line-height: 1.3;
          }
          
          p {
            margin: 0 0 16px 0;
            font-size: 16px;
            line-height: 1.6;
            color: #475569;
          }
          
          .greeting {
            font-size: 18px;
            color: #1e293b;
            margin-bottom: 24px;
          }
          
          /* Celebration box */
          .celebration-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            border: 2px solid #f59e0b;
          }
          
          .celebration-box h2 {
            color: #92400e;
            font-size: 24px;
            margin: 0 0 12px 0;
          }
          
          .celebration-box p {
            color: #78350f;
            margin: 0;
            font-weight: 500;
          }
          
          /* Call-to-action section */
          .cta-section {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
          }
          
          .cta-section h2 {
            color: #1e293b;
            margin-bottom: 16px;
          }
          
          .share-link {
            background-color: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 16px;
            color: #2563eb;
            font-weight: 600;
            word-break: break-all;
          }
          
          /* Signature */
          .signature {
            border-top: 2px solid #e2e8f0;
            padding-top: 30px;
            margin-top: 40px;
            text-align: left;
          }
          
          .signature p {
            margin: 0;
            color: #64748b;
          }
          
          .team-name {
            font-weight: 600;
            color: #1e293b;
          }
          
          /* Footer */
          .email-footer {
            padding: 30px;
            text-align: center;
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }
          
          .email-footer p {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #64748b;
          }
          
          .unsubscribe-link {
            color: #64748b;
            font-size: 14px;
          }
          
          /* Responsive design */
          @media only screen and (max-width: 600px) {
            .email-body_inner {
              width: 100% !important;
              margin: 0 10px !important;
              max-width: calc(100% - 20px) !important;
            }
            
            .email-header,
            .content-cell,
            .celebration-box,
            .cta-section {
              padding: 25px 20px !important;
            }
            
            .email-header h1 {
              font-size: 24px !important;
            }
            
            h2 {
              font-size: 20px !important;
            }
            
            .celebration-box h2 {
              font-size: 22px !important;
            }
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #0f172a !important;
              color: #e2e8f0 !important;
            }
            
            .email-wrapper {
              background-color: #0f172a !important;
            }
            
            .email-body_inner {
              background-color: #1e293b !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
            }
            
            h2, .greeting {
              color: #f1f5f9 !important;
            }
            
            p {
              color: #cbd5e1 !important;
            }
            
            .cta-section {
              background-color: #334155 !important;
            }
            
            .share-link {
              background-color: #475569 !important;
              border-color: #64748b !important;
              color: #60a5fa !important;
            }
            
            .signature p {
              color: #94a3b8 !important;
            }
            
            .team-name {
              color: #f1f5f9 !important;
            }
            
            .email-footer {
              background-color: #0f172a !important;
              border-color: #334155 !important;
            }
            
            .email-footer p,
            .unsubscribe-link {
              color: #94a3b8 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-content">
            <div class="email-body">
              <div class="email-body_inner">
                <!-- Header -->
                <div class="email-header">
                  <span class="emoji">🎉</span>
                  <h1>Grazie per esserti registrato!</h1>
                </div>
                
                <!-- Main content -->
                <div class="content-cell">
                  <p class="greeting">Ciao ${name} 👋</p>
                  
                  <p>Oggi vogliamo festeggiare un piccolo grande traguardo... e tu ne fai parte in modo speciale!</p>
                  
                  <!-- Celebration announcement -->
                  <div class="celebration-box">
                    <h2>🎉 Sei ufficialmente il 100° utente iscritto a Maturamate! 🎉</h2>
                    <p>Un traguardo speciale che condividiamo con te!</p>
                  </div>
                  
                  <p>Un <strong>enorme grazie</strong> per aver scelto di unirti alla nostra community dedicata a rendere la maturità (finalmente!) più chiara e affrontabile.</p>
                  
                  <p>Siamo nati con l'idea di creare uno spazio semplice, utile e gratuito per chi deve affrontare l'Esame di Stato. Sapere che stiamo aiutando studenti come te ci dà la forza di continuare a migliorare ogni giorno.</p>
                  
                  <!-- Call to action -->
                  <div class="cta-section">
                    <h2>✨ Ti va di aiutarci a crescere ancora?</h2>
                    <p>Se ti piace quello che hai trovato su Maturamate, ti chiediamo un piccolo grande gesto: <strong>condividilo con amici, compagni di classe o chiunque possa averne bisogno.</strong></p>
                    <p>Puoi semplicemente condividere questo link:</p>
                    <div class="share-link">
                      👉 https://maturamate.it
                    </div>
                    <p>Ogni persona in più significa una maturità un po' più leggera per tutti 😊</p>
                  </div>
                  
                  <p><strong>Ancora grazie per far parte di questo percorso!</strong></p>
                  
                  <!-- Signature -->
                  <div class="signature">
                    <p>A presto,</p>
                    <p class="team-name">Il team di MaturaMate</p>
                  </div>
                </div>
                
                <!-- Footer -->
                <div class="email-footer">
                  <p>Ricevi questa email perché ti sei iscritto alla lista d'attesa su maturamate.it</p>
                  <p>
                    Non vuoi più ricevere email da noi?
                    <a href="${unsubscribeUrl}" class="unsubscribe-link">Clicca qui per disiscriverti</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

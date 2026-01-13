import { Buffer } from 'node:buffer';

export default {
  async fetch(request, env) {
    // 1. CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const formData = await request.formData();
      
      // Kijk wat voor soort bericht dit is
      const typeWerk = formData.get("Type_Werk"); 
      
      let emailSubject = "";
      let emailHtml = "";
      let emailTo = [];
      
      // BELANGRIJK: Zolang je domein in Resend 'Pending' is, MOET je 'onboarding@resend.dev' gebruiken.
      // Zodra het 'Verified' is, verander je dit naar: "Autoglas Pro <info@autoglaspro.nl>"
      let emailFrom = "Autoglas Pro <info@autoglaspro.nl>"; 

      // --- SCENARIO A: JIJ STUURT EEN MAIL NAAR EEN KLANT (INTAKE) ---
      if (typeWerk === "Vrije_Email") {
        const klantEmail = formData.get("Email_To");
        const onderwerp = formData.get("Onderwerp");
        const bericht = formData.get("Bericht"); // De tekst die jij typt (met enters)
        
        emailTo = [klantEmail]; 
        emailSubject = onderwerp;

        // LOGO URL: Ik gebruik hier de PNG versie die vaak beter werkt in email dan SVG
        // Als deze niet werkt, upload je logo als PNG naar je media bieb en plak de link hier.
        const logoUrl = "https://autoglaspro.nl/wp-content/uploads/2021/04/Autoglas-Pro-Logo-Web-Wit.png";

        // --- HET PREMIUM DESIGN (Gebaseerd op jouw Layout.tsx) ---
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; font-family: sans-serif; background-color: #f1f5f9; }
              .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
              .header { background-color: #0f172a; padding: 30px; text-align: center; } /* slate-900 */
              .accent-bar { height: 6px; background-color: #dc2626; width: 100%; } /* agp-red (approx red-600) */
              .content { padding: 40px 30px; color: #334155; line-height: 1.6; font-size: 16px; }
              .footer { background-color: #0f172a; color: #94a3b8; padding: 40px 30px; text-align: center; font-size: 14px; }
              .footer-title { color: #ffffff; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; display: block; }
              .footer-link { color: #ffffff; text-decoration: none; font-weight: 600; }
              .footer-red { color: #dc2626; text-decoration: none; }
              .copyright { margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 20px; font-size: 12px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="container">
              
              <div class="header">
                 <img src="${logoUrl}" alt="Autoglas Pro" width="220" style="display: block; margin: 0 auto; max-width: 100%; height: auto;">
              </div>
              <div class="accent-bar"></div>

              <div class="content">
                <div style="white-space: pre-wrap;">${bericht}</div>
              </div>

              <div class="footer">
                
                <div style="margin-bottom: 25px;">
                   <span class="footer-title">Contactgegevens</span>
                   Oostwijk 1C<br>
                   5406 XT Uden
                </div>

                <div style="margin-bottom: 25px;">
                   <a href="tel:0413331619" class="footer-link">📞 0413 331 619</a><br><br>
                   <a href="mailto:info@autoglaspro.nl" class="footer-link">✉️ info@autoglaspro.nl</a>
                </div>

                <div style="margin-bottom: 25px;">
                   <a href="https://autoglaspro.nl" class="footer-red">www.autoglaspro.nl</a>
                </div>

                <div class="copyright">
                  &copy; ${new Date().getFullYear()} Autoglas Pro Uden. Alle rechten voorbehouden.
                </div>
              </div>

            </div>
          </body>
          </html>
        `;

      } 
      // --- SCENARIO B: SYSTEEM BERICHT (WERKBON / SCHADEMELDING) ---
      else {
        // (Oude logica voor interne mails)
        const kenteken = formData.get("Kenteken") || "Onbekend";
        const naam = formData.get("Naam");
        const sterren = formData.get("Aantal_Sterren");
        const klantType = formData.get("Klant_Type");
        const opmerkingen = formData.get("Opmerkingen");
        
        const titel = naam ? "Online Schademelding" : "Werkbon";
        emailTo = ["info@autoglaspro.nl"]; 
        emailSubject = `${titel}: ${kenteken} - ${naam || 'Monteur'}`;

        let checklistHtml = "";
        for (const [key, value] of formData.entries()) {
          if (value === "Ja" && !["Kenteken", "Klant_Type", "Type_Werk", "Opmerkingen", "Aantal_Sterren", "Naam", "Email", "Telefoon", "Email_To", "Onderwerp", "Bericht"].includes(key)) {
            checklistHtml += `<li style="margin-bottom: 5px;"><span style="color: #27ae60; font-weight: bold;">✓</span> ${key.replace(/_/g, ' ')}</li>`;
          }
        }

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px;">
              <h1 style="color: #005CAB; text-align: center;">${titel}</h1>
              <h2 style="text-align: center; color: #333;">${kenteken}</h2>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p><strong>Klant:</strong> ${naam || '-'}</p>
              <p><strong>Type:</strong> ${typeWerk} ${sterren ? `(${sterren} Sterren)` : ''}</p>
              ${checklistHtml ? `<h3>Checklist</h3><ul>${checklistHtml}</ul>` : ''}
              <h3>Opmerkingen</h3>
              <p style="background: #fff8e1; padding: 15px;">"${opmerkingen}"</p>
            </div>
          </body>
          </html>
        `;
      }

      // --- BIJLAGEN ---
      const attachments = [];
      const files = formData.getAll("attachment");
      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          attachments.push({
            filename: file.name,
            content: Buffer.from(arrayBuffer),
          });
        }
      }

      // --- VERSTUREN ---
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: emailTo, 
          subject: emailSubject,
          html: emailHtml,
          attachments: attachments
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        throw new Error(`Resend Error: ${errorData}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};

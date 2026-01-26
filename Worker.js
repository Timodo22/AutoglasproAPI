import { Buffer } from 'node:buffer';

export default {
  async fetch(request, env) {
    // 1. CORS Headers (Zorgt dat je website verbinding mag maken)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight request afhandelen
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const formData = await request.formData();
      const typeWerk = formData.get("Type_Werk");
      
      // --- BASIS INSTELLINGEN ---
      
      // STANDAARD ONTVANGER: info@autoglaspro.nl
      // Dit betekent dat alle formulieren hierheen gaan, tenzij we dit later in de code overschrijven.
      let emailTo = ["info@autoglaspro.nl"]; 
      
      let emailFrom = "Autoglas Pro <info@autoglaspro.nl>";
      let emailSubject = "";
      let emailHtml = "";

      // ---------------------------------------------------------
      // SCENARIO 1: NIEUWE INTAKE / OPDRACHT (Formulier op je site)
      // ---------------------------------------------------------
      if (typeWerk === "Intake_Nieuw") {
        // We hoeven emailTo niet aan te passen, die staat al goed (info@autoglaspro.nl).

        // Data ophalen uit formulier
        const kenteken = formData.get("Kenteken") || "-";
        const chassis = formData.get("Chassis") || "-";
        const naam = formData.get("Naam") || "Onbekend";
        const emailKlant = formData.get("Email_Klant") || "-";
        const telefoon = formData.get("Telefoon") || "-";
        const postcode = formData.get("Postcode") || "";
        const huisnummer = formData.get("Huisnummer") || "";
        
        const opdrachtType = formData.get("Opdracht_Type") || "Onbekend";
        const sterren = formData.get("Aantal_Sterren") || "";
        const schadeDatum = formData.get("Schadedatum") || "-";
        
        const facturatieType = formData.get("Facturatie_Type") || "Niet geselecteerd";
        const leaseMaatschappij = formData.get("Leasemaatschappij") || "-";
        const verzekeraar = formData.get("Verzekeraar_Naam") || "-";
        const polisnummer = formData.get("Polisnummer") || "-";
        const garageNaam = formData.get("Garage_Naam") || "-";
        
        const opmerkingen = formData.get("Opmerkingen") || "Geen opmerkingen";

        // Onderwerp bepalen (Kenteken heeft voorrang, anders Chassis)
        const voertuigInfo = kenteken !== "-" && kenteken !== "" ? kenteken : chassis;
        emailSubject = `NIEUWE OPDRACHT: ${opdrachtType} - ${voertuigInfo}`;

        // HTML Tabel opbouwen voor in de mail
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <div style="background-color: #005CAB; padding: 20px; text-align: center; color: white;">
                <h1 style="margin:0; font-size: 24px;">Nieuwe Opdracht</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8;">${new Date().toLocaleDateString('nl-NL')}</p>
              </div>
              <div style="background-color: #E30613; height: 5px; width: 100%;"></div>

              <div style="padding: 20px;">
                
                <h3 style="color: #005CAB; border-bottom: 2px solid #eee; padding-bottom: 5px;">🚗 Voertuig</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 8px; color: #666; width: 40%;">Kenteken:</td><td style="padding: 8px; font-weight: bold;">${kenteken}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Chassis (VIN):</td><td style="padding: 8px; font-weight: bold;">${chassis}</td></tr>
                </table>

                <h3 style="color: #005CAB; border-bottom: 2px solid #eee; padding-bottom: 5px;">👤 Klantgegevens</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 8px; color: #666; width: 40%;">Naam:</td><td style="padding: 8px; font-weight: bold;">${naam}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Adres:</td><td style="padding: 8px;">${postcode} ${huisnummer}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Email:</td><td style="padding: 8px;"><a href="mailto:${emailKlant}">${emailKlant}</a></td></tr>
                  <tr><td style="padding: 8px; color: #666;">Telefoon:</td><td style="padding: 8px;"><a href="tel:${telefoon}">${telefoon}</a></td></tr>
                </table>

                <h3 style="color: #005CAB; border-bottom: 2px solid #eee; padding-bottom: 5px;">🔧 Opdracht Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 8px; color: #666; width: 40%;">Type:</td><td style="padding: 8px; font-weight: bold;">${opdrachtType}</td></tr>
                  ${sterren ? `<tr><td style="padding: 8px; color: #666;">Aantal Sterren:</td><td style="padding: 8px;">${sterren}</td></tr>` : ''}
                  <tr><td style="padding: 8px; color: #666;">Schadedatum:</td><td style="padding: 8px;">${schadeDatum}</td></tr>
                </table>

                <h3 style="color: #005CAB; border-bottom: 2px solid #eee; padding-bottom: 5px;">💶 Facturatie: ${facturatieType}</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  ${leaseMaatschappij !== '-' ? `<tr><td style="padding: 8px; color: #666; width: 40%;">Leasemaatschappij:</td><td style="padding: 8px;">${leaseMaatschappij}</td></tr>` : ''}
                  ${verzekeraar !== '-' ? `<tr><td style="padding: 8px; color: #666; width: 40%;">Verzekeraar:</td><td style="padding: 8px;">${verzekeraar}</td></tr>` : ''}
                  ${polisnummer !== '-' ? `<tr><td style="padding: 8px; color: #666;">Polisnummer:</td><td style="padding: 8px;">${polisnummer}</td></tr>` : ''}
                  ${garageNaam !== '-' ? `<tr><td style="padding: 8px; color: #666;">Garage:</td><td style="padding: 8px;">${garageNaam}</td></tr>` : ''}
                </table>

                <h3 style="color: #005CAB; border-bottom: 2px solid #eee; padding-bottom: 5px;">📝 Opmerkingen</h3>
                <p style="background: #fff8e1; padding: 15px; border-radius: 5px; color: #555;">${opmerkingen}</p>

              </div>
              <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                Verzonden via Autoglas Pro Intake Systeem
              </div>
            </div>
          </body>
          </html>
        `;
      } 
      
      // ---------------------------------------------------------
      // SCENARIO 2: VRIJE EMAIL NAAR KLANT
      // ---------------------------------------------------------
      else if (typeWerk === "Vrije_Email") {
        // HIER overschrijven we het adres, want deze moet naar de klant.
        const klantEmail = formData.get("Email_To");
        emailTo = [klantEmail]; 
        
        const onderwerp = formData.get("Onderwerp");
        const bericht = formData.get("Bericht");
        
        emailSubject = onderwerp;

        const logoUrl = "https://autoglaspro.pages.dev/assets/AutoglasPRO-logo-2-fg5cX_i1.png";

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; font-family: sans-serif; background-color: #f1f5f9; }
              .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
              .header { background-color: #0f172a; padding: 30px; text-align: center; }
              .accent-bar { height: 6px; background-color: #dc2626; width: 100%; }
              .content { padding: 40px 30px; color: #334155; line-height: 1.6; font-size: 16px; }
              .footer { background-color: #0f172a; color: #94a3b8; padding: 40px 30px; text-align: center; font-size: 14px; }
              .footer-link { color: #ffffff; text-decoration: none; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                 <img src="${logoUrl}" alt="Autoglas Pro" width="220" style="display: block; margin: 0 auto;">
              </div>
              <div class="accent-bar"></div>
              <div class="content">
                <div style="white-space: pre-wrap;">${bericht}</div>
              </div>
              <div class="footer">
                <p><strong>Autoglas Pro</strong><br>Oostwijk 1C, 5406 XT Uden</p>
                <a href="https://autoglaspro.nl" class="footer-link">www.autoglaspro.nl</a>
              </div>
            </div>
          </body>
          </html>
        `;
      } 
      else {
        // Fallback als er geen type is meegegeven (zou niet moeten gebeuren met nieuwe code)
        return new Response(JSON.stringify({ success: false, message: "Type werk onbekend" }), { headers: corsHeaders });
      }

      // --- BIJLAGEN VERWERKEN ---
      const attachments = [];
      const files = formData.getAll("attachment");
      const today = new Date().toISOString().slice(0, 10); 

      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          // Bestandsnaam veilig maken (spaties eruit etc)
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          
          attachments.push({
            filename: `${today}_${safeName}`,
            content: Buffer.from(arrayBuffer),
          });
        }
      }

      // --- VERSTUREN NAAR RESEND ---
      // Hier wordt de variabele 'emailTo' gebruikt. 
      // Die is dus "info@autoglaspro.nl" bij Intake, of "klant@email.nl" bij Vrije Email.
      
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

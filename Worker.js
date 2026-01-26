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
      const typeWerk = formData.get("Type_Werk");
      
      // BASIS INSTELLINGEN
      let emailTo = ["info@autoglaspro.nl"]; 
      let emailFrom = "Autoglas Pro <info@autoglaspro.nl>";
      let emailSubject = "";
      let emailHtml = "";

      // ---------------------------------------------------------
      // SCENARIO 1: NIEUWE INTAKE / OPDRACHT
      // ---------------------------------------------------------
      if (typeWerk === "Intake_Nieuw") {
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

        const voertuigInfo = kenteken !== "-" && kenteken !== "" ? kenteken : chassis;
        emailSubject = `NIEUWE OPDRACHT: ${opdrachtType} - ${voertuigInfo}`;

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #005CAB; padding: 20px; text-align: center; color: white;">
                <h1 style="margin:0; font-size: 24px;">Nieuwe Intake</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8;">${new Date().toLocaleDateString('nl-NL')}</p>
              </div>
              <div style="background-color: #E30613; height: 5px; width: 100%;"></div>
              <div style="padding: 20px;">
                <h3 style="color: #005CAB;">🚗 Voertuig</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 8px; color: #666; width: 40%;">Kenteken:</td><td style="padding: 8px; font-weight: bold;">${kenteken}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Chassis:</td><td style="padding: 8px;">${chassis}</td></tr>
                </table>
                <h3 style="color: #005CAB;">👤 Klant</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 8px; color: #666; width: 40%;">Naam:</td><td style="padding: 8px; font-weight: bold;">${naam}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Tel/Email:</td><td style="padding: 8px;">${telefoon} / ${emailKlant}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Locatie:</td><td style="padding: 8px;">${postcode} ${huisnummer}</td></tr>
                </table>
                <h3 style="color: #005CAB;">🔧 Opdracht</h3>
                <p><strong>Type:</strong> ${opdrachtType} ${sterren ? `(${sterren} sterren)` : ''}</p>
                <p><strong>Facturatie:</strong> ${facturatieType} ${verzekeraar !== '-' ? `(${verzekeraar})` : ''}</p>
                <div style="background: #fff8e1; padding: 10px; border-radius: 5px; margin-top:10px;">Opmerking: ${opmerkingen}</div>
              </div>
            </div>
          </body>
          </html>
        `;
      } 
      
      // ---------------------------------------------------------
      // SCENARIO 2: WERKBON (NIEUW TOEGEVOEGD)
      // ---------------------------------------------------------
      else if (typeWerk === "Reparatie" || typeWerk === "Vervanging") {
        // Data ophalen specifiek voor werkbon
        const kenteken = formData.get("Kenteken") || "Onbekend";
        const klantType = formData.get("Klant_Type") || "B2B";
        const datum = formData.get("Datum") || new Date().toLocaleDateString('nl-NL');
        const sterren = formData.get("Aantal_Sterren") || "";
        const opmerkingen = formData.get("Opmerkingen") || "-";

        // Checklist items ophalen (als ze bestaan zijn ze "Ja", anders "Nee")
        const getCheck = (key) => formData.get(key) === "Ja" ? "✅ Ja" : "❌ Nee";
        const regenSensor = getCheck("Regen_Sensor");
        const clips = getCheck("Clips");
        const bovenLijst = getCheck("Boven_Lijst");
        const driekwartLijst = getCheck("Driekwart_Lijst");
        const statischeCal = getCheck("Statische_Calibratie");
        const dynamischeCal = getCheck("Dynamische_Calibratie");

        emailSubject = `WERKBON: ${kenteken} - ${typeWerk}`;
        
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <div style="background-color: #333; padding: 20px; text-align: center; color: white;">
                <h1 style="margin:0; font-size: 24px;">Werkbon Afgerond</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8; font-weight:bold; color: #FFD700;">${kenteken}</p>
              </div>
              <div style="background-color: #005CAB; height: 5px; width: 100%;"></div>

              <div style="padding: 20px;">
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 8px; border-bottom:1px solid #eee;"><strong>Datum:</strong></td><td style="padding: 8px; border-bottom:1px solid #eee;">${datum}</td></tr>
                  <tr><td style="padding: 8px; border-bottom:1px solid #eee;"><strong>Type Werk:</strong></td><td style="padding: 8px; border-bottom:1px solid #eee;">${typeWerk} ${sterren ? `(${sterren} sterren)` : ''}</td></tr>
                  <tr><td style="padding: 8px; border-bottom:1px solid #eee;"><strong>Klant Type:</strong></td><td style="padding: 8px; border-bottom:1px solid #eee;">${klantType}</td></tr>
                </table>

                <h3 style="color: #005CAB; border-bottom: 2px solid #eee; padding-bottom: 5px;">🛠️ Onderdelen & Service</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                  <tr><td style="padding: 6px;">Regen Sensor:</td><td style="padding: 6px;">${regenSensor}</td></tr>
                  <tr><td style="padding: 6px;">Clips:</td><td style="padding: 6px;">${clips}</td></tr>
                  <tr><td style="padding: 6px;">Bovenlijst:</td><td style="padding: 6px;">${bovenLijst}</td></tr>
                  <tr><td style="padding: 6px;">Driekwart Lijst:</td><td style="padding: 6px;">${driekwartLijst}</td></tr>
                  <tr><td style="padding: 6px;">Statische Calibratie:</td><td style="padding: 6px;">${statischeCal}</td></tr>
                  <tr><td style="padding: 6px;">Dynamische Calibratie:</td><td style="padding: 6px;">${dynamischeCal}</td></tr>
                </table>

                <h3 style="color: #005CAB; border-bottom: 2px solid #eee; padding-bottom: 5px;">📝 Opmerkingen</h3>
                <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555; border-left: 4px solid #005CAB;">${opmerkingen}</p>
                
                <p style="text-align:center; color:#888; font-size:12px; margin-top:30px;">
                   Zie bijlagen voor foto's (indien toegevoegd).
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      // ---------------------------------------------------------
      // SCENARIO 3: VRIJE EMAIL NAAR KLANT
      // ---------------------------------------------------------
      else if (typeWerk === "Vrije_Email") {
        const klantEmail = formData.get("Email_To");
        emailTo = [klantEmail]; 
        
        const onderwerp = formData.get("Onderwerp");
        const bericht = formData.get("Bericht");
        
        emailSubject = onderwerp;
        const logoUrl = "https://autoglaspro.pages.dev/assets/AutoglasPRO-logo-2-fg5cX_i1.png";

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: sans-serif; background-color: #f1f5f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #0f172a; padding: 30px; text-align: center;">
                 <img src="${logoUrl}" alt="Autoglas Pro" width="220" style="display: block; margin: 0 auto;">
              </div>
              <div style="height: 6px; background-color: #dc2626; width: 100%;"></div>
              <div style="padding: 40px 30px; color: #334155; line-height: 1.6;">
                <div style="white-space: pre-wrap;">${bericht}</div>
              </div>
              <div style="background-color: #0f172a; color: #94a3b8; padding: 30px; text-align: center; font-size: 14px;">
                <p><strong>Autoglas Pro</strong><br>Oostwijk 1C, 5406 XT Uden</p>
                <a href="https://autoglaspro.nl" style="color: #ffffff; text-decoration: none;">www.autoglaspro.nl</a>
              </div>
            </div>
          </body>
          </html>
        `;
      } 
      
      else {
        // Fallback als Type_Werk echt onbekend is
        return new Response(JSON.stringify({ success: false, message: `Type werk onbekend: ${typeWerk}` }), { headers: corsHeaders });
      }

      // --- BIJLAGEN VERWERKEN (Werkt voor alle scenarios) ---
      const attachments = [];
      const files = formData.getAll("attachment");
      const today = new Date().toISOString().slice(0, 10); 

      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          
          attachments.push({
            filename: `${today}_${safeName}`,
            content: Buffer.from(arrayBuffer),
          });
        }
      }

      // --- VERSTUREN NAAR RESEND ---
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

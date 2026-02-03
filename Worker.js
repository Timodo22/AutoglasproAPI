import { Buffer } from 'node:buffer';

export default {
  async fetch(request, env) {
    // 1. CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. OPTIONS (Preflight) requests afhandelen
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (!env.RESEND_API_KEY) {
        throw new Error("Server Error: RESEND_API_KEY ontbreekt in settings");
      }

      const formData = await request.formData();
      const typeWerk = formData.get("Type_Werk");
      
      let emailTo = ["info@autoglaspro.nl"]; 
      let emailFrom = "Autoglas Pro <info@autoglaspro.nl>";
      let emailSubject = "";
      let emailHtml = "";

      // --- SCENARIO 1: DE WERKBON ---
      if (typeWerk === "Reparatie" || typeWerk === "Vervanging" || typeWerk === "Ruit Reparatie" || typeWerk === "Ruit Vervanging") {
        // Forceer Kenteken naar UPPERCASE
        const kenteken = (formData.get("Kenteken") || "Onbekend").toUpperCase();
        const klantType = formData.get("Klant_Type") || "B2B";
        const datum = formData.get("Datum") || new Date().toLocaleDateString('nl-NL');
        const sterren = formData.get("Aantal_Sterren") || "";
        const opmerkingen = formData.get("Opmerkingen") || "-";
        const getCheck = (key) => formData.get(key) === "Ja" ? "✅ Ja" : "❌ Nee";
        
        emailSubject = `WERKBON: ${kenteken} - ${typeWerk}`;
        
        emailHtml = `
          <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #333; padding: 20px; text-align: center; color: white;">
                <h1 style="margin:0; font-size: 24px;">Werkbon Afgerond</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8; font-weight:bold; color: #FFD700;">${kenteken}</p>
              </div>
              <div style="padding: 20px;">
                <p><strong>Datum:</strong> ${datum}</p>
                <p><strong>Type:</strong> ${typeWerk} ${sterren ? `(${sterren}*)` : ''}</p>
                <p><strong>Klant:</strong> ${klantType}</p>
                <hr>
                <h3>Onderdelen</h3>
                <p>Regen Sensor: ${getCheck("Regen_Sensor")}</p>
                <p>Clips: ${getCheck("Clips")}</p>
                <p>Bovenlijst: ${getCheck("Boven_Lijst")}</p>
                <p>Driekwart Lijst: ${getCheck("Driekwart_Lijst")}</p>
                <p>Statische Calibratie: ${getCheck("Statische_Calibratie")}</p>
                <p>Dynamische Calibratie: ${getCheck("Dynamische_Calibratie")}</p>
                <hr>
                <p><strong>Opmerking:</strong> ${opmerkingen}</p>
              </div>
            </div>
          </body></html>`;
      } 
      
      // --- SCENARIO 2: DE INTAKE ---
      else if (typeWerk === "Intake_Nieuw") {
        // Forceer Kenteken en Chassis naar UPPERCASE
        const kenteken = (formData.get("Kenteken") || "").toUpperCase();
        const chassis = (formData.get("Chassis") || "").toUpperCase();
        const voertuigHeader = kenteken ? kenteken : (chassis ? `VIN: ${chassis}` : "Onbekend Voertuig");

        const naam = formData.get("Naam") || "Onbekend";
        const emailKlant = formData.get("Email_Klant") || "-";
        const telefoon = formData.get("Telefoon") || "-";
        const postcode = formData.get("Postcode") || "";
        const huisnummer = formData.get("Huisnummer") || "";
        
        const opdrachtType = formData.get("Opdracht_Type") || "Onbekend";
        const aantalSterren = formData.get("Aantal_Sterren") || "";
        const schadedatum = formData.get("Schadedatum") || "-";
        
        const facturatieType = formData.get("Facturatie_Type") || "-";
        const leasemaatschappij = formData.get("Leasemaatschappij") || "";
        const verzekeraar = formData.get("Verzekeraar_Naam") || "";
        const polisnummer = formData.get("Polisnummer") || "";
        const garage = formData.get("Garage_Naam") || "";
        
        const opmerkingen = formData.get("Opmerkingen") || "-";

        emailSubject = `NIEUWE OPDRACHT: ${voertuigHeader} - ${opdrachtType}`;

        // Facturatie details samenstellen
        let facturatieDetails = `<p>Type: ${facturatieType}</p>`;
        if (facturatieType === "Lease") facturatieDetails += `<p>Maatschappij: <strong>${leasemaatschappij}</strong></p>`;
        if (facturatieType === "Verzekeraar") facturatieDetails += `<p>Verzekeraar: <strong>${verzekeraar}</strong></p><p>Polisnr: ${polisnummer}</p>`;
        if (facturatieType === "Garage") facturatieDetails += `<p>Garage: <strong>${garage}</strong></p>`;

        emailHtml = `
          <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background-color: #f0f4f8; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              
              <div style="background-color: #005CAB; padding: 25px; text-align: center; color: white; border-bottom: 4px solid #E30613;">
                <h1 style="margin:0; font-size: 22px; text-transform: uppercase;">Nieuwe Intake</h1>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight:bold;">${voertuigHeader}</p>
              </div>

              <div style="padding: 25px;">
                
                <h3 style="color: #005CAB; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0;">👤 Klantgegevens</h3>
                <table style="width: 100%; font-size: 14px; margin-bottom: 20px;">
                  <tr><td style="width: 120px; color: #666;">Naam:</td><td><strong>${naam}</strong></td></tr>
                  <tr><td style="color: #666;">Email:</td><td>${emailKlant}</td></tr>
                  <tr><td style="color: #666;">Tel:</td><td>${telefoon}</td></tr>
                  <tr><td style="color: #666;">Adres:</td><td>${postcode} ${huisnummer}</td></tr>
                </table>

                <h3 style="color: #005CAB; border-bottom: 1px solid #eee; padding-bottom: 5px;">🔧 Opdracht</h3>
                <table style="width: 100%; font-size: 14px; margin-bottom: 20px;">
                  <tr><td style="width: 120px; color: #666;">Type:</td><td><strong>${opdrachtType}</strong> ${aantalSterren ? `(${aantalSterren} sterren)` : ''}</td></tr>
                  ${schadedatum !== '-' ? `<tr><td style="color: #666;">Schadedatum:</td><td>${schadedatum}</td></tr>` : ''}
                  <tr><td style="color: #666;">Kenteken:</td><td>${kenteken || '-'}</td></tr>
                  <tr><td style="color: #666;">Chassis (VIN):</td><td>${chassis || '-'}</td></tr>
                </table>

                <h3 style="color: #005CAB; border-bottom: 1px solid #eee; padding-bottom: 5px;">💳 Facturatie</h3>
                <div style="font-size: 14px; margin-bottom: 20px; color: #333;">
                  ${facturatieDetails}
                </div>

                ${opmerkingen !== '-' ? `
                <div style="background-color: #fff8e1; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
                  <strong>Opmerking:</strong><br>${opmerkingen}
                </div>` : ''}

              </div>
              <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #999;">
                Verzonden via Autoglas Pro App
              </div>
            </div>
          </body></html>`;
      } 
      
      // --- FALLBACK ---
      else {
          emailSubject = `Nieuwe inzending: ${typeWerk}`;
          emailHtml = `<p>Er is een formulier ingevuld van type: ${typeWerk}. De details zijn niet specifiek geprogrammeerd.</p>`;
      }

      // --- BIJLAGEN VERWERKEN ---
      const attachments = [];
      const files = formData.getAll("attachment");
      const today = new Date().toISOString().slice(0, 10); 

      let totalSize = 0;
      for (const file of files) {
        if (file instanceof File) {
          totalSize += file.size;
          if (totalSize > 15 * 1024 * 1024) throw new Error("De foto's zijn te groot (Max 15MB totaal). Probeer minder foto's.");

          const arrayBuffer = await file.arrayBuffer();
          const contentBuffer = Buffer.from(arrayBuffer);
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          
          attachments.push({
            filename: `${today}_${safeName}`,
            content: contentBuffer,
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
        const errorText = await resendResponse.text();
        console.error("Resend Fout:", errorText);
        throw new Error("Fout bij versturen email: " + errorText);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("Worker Error:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: error.message || "Onbekende server fout" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};

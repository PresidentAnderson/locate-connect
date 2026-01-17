/**
 * Email service for sending confirmation emails
 * This is a placeholder implementation. To enable email functionality:
 * 1. Add an email service provider (Resend, SendGrid, etc.) to package.json
 * 2. Add API keys to environment variables
 * 3. Implement the send function with the chosen provider
 */

export interface CaseConfirmationEmailData {
  reporterEmail: string;
  reporterName: string;
  caseNumber: string;
  missingPersonName: string;
  lastSeenDate: string;
  locale?: string;
}

/**
 * Send case confirmation email to reporter
 * Currently returns success without sending. Implement with real email service.
 */
export async function sendCaseConfirmationEmail(
  data: CaseConfirmationEmailData
): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement with real email service provider
  // Example with Resend:
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    console.log(`[Email Service] Would send confirmation email to ${data.reporterEmail} for case ${data.caseNumber}`);
    
    // Placeholder - return success without actually sending
    // In production, replace with:
    // const { data: emailData, error } = await resend.emails.send({
    //   from: 'LocateConnect <noreply@locateconnect.ca>',
    //   to: [data.reporterEmail],
    //   subject: `Case Confirmation - ${data.caseNumber}`,
    //   html: generateEmailTemplate(data),
    // });
    
    // if (error) {
    //   return { success: false, error: error.message };
    // }
    
    return { success: true };
  } catch (error) {
    console.error('[Email Service] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Generate HTML email template for case confirmation
 * Exported for use when implementing real email service
 */
export function generateEmailTemplate(data: CaseConfirmationEmailData): string {
  const isEnglish = !data.locale || data.locale.startsWith('en');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0891b2; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .case-number { font-size: 24px; font-weight: bold; color: #0891b2; margin: 20px 0; }
    .section { margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isEnglish ? 'Case Report Received' : 'Signalement reçu'}</h1>
    </div>
    <div class="content">
      <p>${isEnglish ? 'Dear' : 'Cher/Chère'} ${data.reporterName},</p>
      
      <p>
        ${isEnglish 
          ? 'Thank you for submitting a missing person report. We have received your information and our team will begin processing your case immediately.'
          : 'Merci d\'avoir soumis un signalement de personne disparue. Nous avons reçu vos informations et notre équipe commencera à traiter votre dossier immédiatement.'}
      </p>
      
      <div class="case-number">
        ${isEnglish ? 'Case Number:' : 'Numéro de dossier :'} ${data.caseNumber}
      </div>
      
      <div class="section">
        <h3>${isEnglish ? 'Report Details:' : 'Détails du signalement :'}</h3>
        <ul>
          <li><strong>${isEnglish ? 'Missing Person:' : 'Personne disparue :'}</strong> ${data.missingPersonName}</li>
          <li><strong>${isEnglish ? 'Last Seen:' : 'Dernière observation :'}</strong> ${new Date(data.lastSeenDate).toLocaleDateString(data.locale || 'en-CA')}</li>
        </ul>
      </div>
      
      <div class="section">
        <h3>${isEnglish ? 'Next Steps:' : 'Prochaines étapes :'}</h3>
        <ol>
          <li>${isEnglish 
            ? 'A coordinator will validate the details and may reach out for clarification.'
            : 'Un coordonnateur validera les informations et pourrait vous contacter pour des clarifications.'}</li>
          <li>${isEnglish 
            ? 'We will notify relevant agencies and assign a response team.'
            : 'Nous informerons les organismes concernés et affecterons une équipe.'}</li>
          <li>${isEnglish 
            ? 'You can monitor updates in your case dashboard.'
            : 'Vous pouvez suivre les mises à jour dans votre tableau de bord.'}</li>
        </ol>
      </div>
      
      <p>
        ${isEnglish 
          ? 'Please keep this case number for your records. You can use it to check the status of your report at any time.'
          : 'Veuillez conserver ce numéro de dossier pour vos dossiers. Vous pouvez l\'utiliser pour vérifier l\'état de votre signalement à tout moment.'}
      </p>
    </div>
    <div class="footer">
      <p>
        ${isEnglish 
          ? 'This is an automated message. Please do not reply to this email.'
          : 'Ceci est un message automatisé. Veuillez ne pas répondre à ce courriel.'}
      </p>
      <p>&copy; ${new Date().getFullYear()} LocateConnect</p>
    </div>
  </div>
</body>
</html>
  `;
}

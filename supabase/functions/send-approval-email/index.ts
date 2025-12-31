import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get SendGrid API key from environment
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY is not configured')
    }

    // Get sender email from environment
    const senderEmail = Deno.env.get('SENDER_EMAIL') || 'info@shpdtraining.com'

    // Parse request body
    const {
      to,
      subject,
      officerName,
      trainingName,
      trainingDate,
      notes,
      approverName,
      recipientName,
      badgeNumber,
      trainingType,
      dateSubmitted,
      systemLink
    } = await req.json()

    // Validate required fields
    if (!to || !subject || !officerName || !trainingName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create professional HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale-1">
  <title>Training Request Notification</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #1e3a8a;
    }
    .info-box {
      background-color: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #475569;
      min-width: 140px;
    }
    .info-value {
      color: #1e293b;
    }
    .notes-section {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notes-section h3 {
      margin: 0 0 10px 0;
      color: #92400e;
      font-size: 14px;
      font-weight: 600;
    }
    .notes-section p {
      margin: 0;
      color: #78350f;
    }
    .action-button {
      display: inline-block;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Training Request Notification</h1>
      <p>Shaker Heights Police Department</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${recipientName || 'Training Coordinator'},</p>
      
      <p>A new training request has been submitted and requires your attention.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Officer Name:</span>
          <span class="info-value">${officerName}</span>
        </div>
        ${badgeNumber ? `
        <div class="info-row">
          <span class="info-label">Badge Number:</span>
          <span class="info-value">${badgeNumber}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Training Name:</span>
          <span class="info-value">${trainingName}</span>
        </div>
        ${trainingType ? `
        <div class="info-row">
          <span class="info-label">Training Type:</span>
          <span class="info-value">${trainingType}</span>
        </div>
        ` : ''}
        ${trainingDate ? `
        <div class="info-row">
          <span class="info-label">Training Date:</span>
          <span class="info-value">${trainingDate}</span>
        </div>
        ` : ''}
        ${dateSubmitted ? `
        <div class="info-row">
          <span class="info-label">Date Submitted:</span>
          <span class="info-value">${dateSubmitted}</span>
        </div>
        ` : ''}
        ${approverName ? `
        <div class="info-row">
          <span class="info-label">Approver:</span>
          <span class="info-value">${approverName}</span>
        </div>
        ` : ''}
      </div>
      
      ${notes ? `
      <div class="notes-section">
        <h3>📝 Additional Notes</h3>
        <p>${notes}</p>
      </div>
      ` : ''}
      
      ${systemLink ? `
      <div style="text-align: center;">
        <a href="${systemLink}" class="action-button">View Request in System</a>
      </div>
      ` : ''}
      
      <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
        Please review this request at your earliest convenience.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Shaker Heights Police Department</strong></p>
      <p>Training Management System</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `

    // Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject,
          },
        ],
        from: {
          email: senderEmail,
          name: 'SHPD Training System',
        },
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid error:', errorText)
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
    }

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

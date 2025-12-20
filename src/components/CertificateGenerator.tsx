import React, { useState, useRef } from 'react';
import { Certificate } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  DownloadIcon,
  PrintIcon,
  CheckIcon,
  CloseIcon,
} from '@/components/icons/Icons';

interface CertificateGeneratorProps {
  certificate: Certificate;
  officerName: string;
  badgeNumber: string;
  onClose?: () => void;
}

const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
  certificate,
  officerName,
  badgeNumber,
  onClose,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      // Create a canvas from the certificate element
      const element = certificateRef.current;
      if (!element) return;

      // Use html2canvas-like approach with SVG
      const svgContent = generateCertificateSVG();
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${certificate.certificateNumber}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Training Certificate - ${certificate.certificateNumber}</title>
          <style>
            @page { size: landscape; margin: 0.5in; }
            body { margin: 0; padding: 0; font-family: 'Georgia', serif; }
            .certificate { 
              width: 100%; 
              max-width: 11in; 
              margin: 0 auto; 
              padding: 40px;
              border: 8px double #1e3a5f;
              background: linear-gradient(135deg, #fefefe 0%, #f8f9fa 100%);
              box-sizing: border-box;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .badge { 
              width: 80px; 
              height: 80px; 
              margin: 0 auto 20px;
              background: linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #1e3a5f;
            }
            .badge-inner {
              width: 60px;
              height: 60px;
              background: #1e3a5f;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #d4af37;
              font-weight: bold;
              font-size: 12px;
            }
            .title { 
              font-size: 36px; 
              color: #1e3a5f; 
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 4px;
            }
            .subtitle { 
              font-size: 18px; 
              color: #4a5568; 
              margin-top: 10px;
              letter-spacing: 2px;
            }
            .recipient { 
              text-align: center; 
              margin: 40px 0;
            }
            .recipient-label { 
              font-size: 14px; 
              color: #718096;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .recipient-name { 
              font-size: 32px; 
              color: #1e3a5f;
              font-style: italic;
              margin: 10px 0;
              border-bottom: 2px solid #d4af37;
              display: inline-block;
              padding: 0 20px 5px;
            }
            .badge-number {
              font-size: 16px;
              color: #4a5568;
              margin-top: 5px;
            }
            .training-info { 
              text-align: center; 
              margin: 30px 0;
            }
            .training-title { 
              font-size: 24px; 
              color: #2d3748;
              font-weight: bold;
              margin: 10px 0;
            }
            .details { 
              display: flex; 
              justify-content: center; 
              gap: 60px;
              margin: 30px 0;
            }
            .detail { text-align: center; }
            .detail-label { 
              font-size: 12px; 
              color: #718096;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .detail-value { 
              font-size: 16px; 
              color: #2d3748;
              font-weight: bold;
              margin-top: 5px;
            }
            .signatures { 
              display: flex; 
              justify-content: space-around; 
              margin-top: 50px;
              padding-top: 30px;
            }
            .signature { text-align: center; }
            .signature-line { 
              width: 200px; 
              border-bottom: 1px solid #1e3a5f;
              margin-bottom: 5px;
              height: 30px;
              font-style: italic;
              font-size: 18px;
              color: #1e3a5f;
            }
            .signature-label { 
              font-size: 12px; 
              color: #718096;
              text-transform: uppercase;
            }
            .cert-number { 
              text-align: center; 
              margin-top: 30px;
              font-size: 12px;
              color: #a0aec0;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="badge">
                <div class="badge-inner">POLICE</div>
              </div>
              <h1 class="title">Certificate of Completion</h1>
              <p class="subtitle">Police Department Training Division</p>
            </div>
            
            <div class="recipient">
              <p class="recipient-label">This is to certify that</p>
              <p class="recipient-name">${officerName}</p>
              <p class="badge-number">Badge #${badgeNumber}</p>
            </div>
            
            <div class="training-info">
              <p class="recipient-label">has successfully completed</p>
              <p class="training-title">${certificate.trainingTitle}</p>
            </div>
            
            <div class="details">
              <div class="detail">
                <p class="detail-label">Completion Date</p>
                <p class="detail-value">${formatDate(certificate.completionDate)}</p>
              </div>
              <div class="detail">
                <p class="detail-label">Credits Earned</p>
                <p class="detail-value">${certificate.creditsEarned} Credits</p>
              </div>
              <div class="detail">
                <p class="detail-label">Issue Date</p>
                <p class="detail-value">${formatDate(certificate.issuedDate)}</p>
              </div>
            </div>
            
            <div class="signatures">
              <div class="signature">
                <div class="signature-line">${certificate.instructorName}</div>
                <p class="signature-label">Instructor</p>
              </div>
              <div class="signature">
                <div class="signature-line">Training Division</div>
                <p class="signature-label">Department Authorization</p>
              </div>
            </div>
            
            <p class="cert-number">Certificate Number: ${certificate.certificateNumber}</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const generateCertificateSVG = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="850" viewBox="0 0 1100 850">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4af37"/>
      <stop offset="50%" style="stop-color:#f4d03f"/>
      <stop offset="100%" style="stop-color:#d4af37"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fefefe"/>
      <stop offset="100%" style="stop-color:#f8f9fa"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1100" height="850" fill="url(#bgGrad)"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="1060" height="810" fill="none" stroke="#1e3a5f" stroke-width="8"/>
  <rect x="35" y="35" width="1030" height="780" fill="none" stroke="#1e3a5f" stroke-width="2"/>
  
  <!-- Badge -->
  <circle cx="550" cy="100" r="50" fill="url(#goldGrad)" stroke="#1e3a5f" stroke-width="3"/>
  <circle cx="550" cy="100" r="35" fill="#1e3a5f"/>
  <text x="550" y="105" text-anchor="middle" fill="#d4af37" font-family="Georgia" font-size="12" font-weight="bold">POLICE</text>
  
  <!-- Title -->
  <text x="550" y="200" text-anchor="middle" fill="#1e3a5f" font-family="Georgia" font-size="42" font-weight="bold" letter-spacing="4">CERTIFICATE OF COMPLETION</text>
  <text x="550" y="235" text-anchor="middle" fill="#4a5568" font-family="Georgia" font-size="18" letter-spacing="2">Police Department Training Division</text>
  
  <!-- Recipient -->
  <text x="550" y="310" text-anchor="middle" fill="#718096" font-family="Georgia" font-size="14" letter-spacing="2">THIS IS TO CERTIFY THAT</text>
  <text x="550" y="360" text-anchor="middle" fill="#1e3a5f" font-family="Georgia" font-size="36" font-style="italic">${officerName}</text>
  <line x1="350" y1="370" x2="750" y2="370" stroke="#d4af37" stroke-width="2"/>
  <text x="550" y="400" text-anchor="middle" fill="#4a5568" font-family="Georgia" font-size="16">Badge #${badgeNumber}</text>
  
  <!-- Training Info -->
  <text x="550" y="460" text-anchor="middle" fill="#718096" font-family="Georgia" font-size="14" letter-spacing="2">HAS SUCCESSFULLY COMPLETED</text>
  <text x="550" y="510" text-anchor="middle" fill="#2d3748" font-family="Georgia" font-size="28" font-weight="bold">${certificate.trainingTitle}</text>
  
  <!-- Details -->
  <text x="250" y="590" text-anchor="middle" fill="#718096" font-family="Georgia" font-size="12" letter-spacing="1">COMPLETION DATE</text>
  <text x="250" y="615" text-anchor="middle" fill="#2d3748" font-family="Georgia" font-size="16" font-weight="bold">${formatDate(certificate.completionDate)}</text>
  
  <text x="550" y="590" text-anchor="middle" fill="#718096" font-family="Georgia" font-size="12" letter-spacing="1">CREDITS EARNED</text>
  <text x="550" y="615" text-anchor="middle" fill="#2d3748" font-family="Georgia" font-size="16" font-weight="bold">${certificate.creditsEarned} Credits</text>
  
  <text x="850" y="590" text-anchor="middle" fill="#718096" font-family="Georgia" font-size="12" letter-spacing="1">ISSUE DATE</text>
  <text x="850" y="615" text-anchor="middle" fill="#2d3748" font-family="Georgia" font-size="16" font-weight="bold">${formatDate(certificate.issuedDate)}</text>
  
  <!-- Signatures -->
  <text x="300" y="720" text-anchor="middle" fill="#1e3a5f" font-family="Georgia" font-size="18" font-style="italic">${certificate.instructorName}</text>
  <line x1="150" y1="730" x2="450" y2="730" stroke="#1e3a5f" stroke-width="1"/>
  <text x="300" y="755" text-anchor="middle" fill="#718096" font-family="Georgia" font-size="12" letter-spacing="1">INSTRUCTOR</text>
  
  <text x="800" y="720" text-anchor="middle" fill="#1e3a5f" font-family="Georgia" font-size="18" font-style="italic">Training Division</text>
  <line x1="650" y1="730" x2="950" y2="730" stroke="#1e3a5f" stroke-width="1"/>
  <text x="800" y="755" text-anchor="middle" fill="#718096" font-family="Georgia" font-size="12" letter-spacing="1">DEPARTMENT AUTHORIZATION</text>
  
  <!-- Certificate Number -->
  <text x="550" y="800" text-anchor="middle" fill="#a0aec0" font-family="Georgia" font-size="12">Certificate Number: ${certificate.certificateNumber}</text>
</svg>`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Training Certificate</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <PrintIcon size={18} />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <DownloadIcon size={18} />
              {isGenerating ? 'Generating...' : 'Download'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <CloseIcon size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="p-6 overflow-auto bg-slate-100" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          <div
            ref={certificateRef}
            className="bg-gradient-to-br from-white to-slate-50 mx-auto shadow-lg"
            style={{ 
              width: '100%', 
              maxWidth: '900px',
              aspectRatio: '11/8.5',
              border: '8px double #1e3a5f',
              padding: '40px',
            }}
          >
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)',
                  border: '3px solid #1e3a5f'
                }}
              >
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="text-amber-400 font-bold text-xs">POLICE</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 
                className="text-3xl md:text-4xl font-bold tracking-widest mb-2"
                style={{ color: '#1e3a5f' }}
              >
                CERTIFICATE OF COMPLETION
              </h1>
              <p className="text-slate-500 tracking-wider">Police Department Training Division</p>
            </div>

            {/* Recipient */}
            <div className="text-center mb-8">
              <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">This is to certify that</p>
              <p 
                className="text-2xl md:text-3xl italic border-b-2 inline-block px-8 pb-1"
                style={{ color: '#1e3a5f', borderColor: '#d4af37' }}
              >
                {officerName}
              </p>
              <p className="text-slate-600 mt-2">Badge #{badgeNumber}</p>
            </div>

            {/* Training Info */}
            <div className="text-center mb-8">
              <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">has successfully completed</p>
              <p className="text-xl md:text-2xl font-bold text-slate-700">{certificate.trainingTitle}</p>
            </div>

            {/* Details */}
            <div className="flex justify-center gap-12 md:gap-20 mb-10">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Completion Date</p>
                <p className="font-bold text-slate-700">{formatDate(certificate.completionDate)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Credits Earned</p>
                <p className="font-bold text-slate-700">{certificate.creditsEarned} Credits</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Issue Date</p>
                <p className="font-bold text-slate-700">{formatDate(certificate.issuedDate)}</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-around mt-12 pt-8">
              <div className="text-center">
                <p 
                  className="italic text-lg mb-1"
                  style={{ color: '#1e3a5f' }}
                >
                  {certificate.instructorName}
                </p>
                <div className="w-48 border-b border-slate-800 mb-1"></div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Instructor</p>
              </div>
              <div className="text-center">
                <p 
                  className="italic text-lg mb-1"
                  style={{ color: '#1e3a5f' }}
                >
                  Training Division
                </p>
                <div className="w-48 border-b border-slate-800 mb-1"></div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Department Authorization</p>
              </div>
            </div>

            {/* Certificate Number */}
            <p className="text-center text-xs text-slate-400 mt-8">
              Certificate Number: {certificate.certificateNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;

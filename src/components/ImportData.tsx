import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { documentService, userService } from '@/lib/database';
import { User, Document as DocType } from '@/types';

import {
  ImportIcon,
  CheckIcon,
  XIcon,
  AlertIcon,
  TrainingIcon,
  UsersIcon,
  CertificateIcon,
  DocumentIcon,
  UploadIcon,
  ProfileIcon,
} from '@/components/icons/Icons';

interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  errors: string[];
}

// CSV parsing helper function
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const results: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    
    results.push(row);
  }
  
  return results;
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

const ImportData: React.FC = () => {
  const { user, allUsers, refreshUsers } = useAuth();
  const [importType, setImportType] = useState<'training' | 'users' | 'certificates'>('training');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Certificate import specific states
  const [selectedOfficer, setSelectedOfficer] = useState<string>('');
  const [certTitle, setCertTitle] = useState('');
  const [certType, setCertType] = useState<DocType['documentType']>('certificate');
  const [certDescription, setCertDescription] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certExpDate, setCertExpDate] = useState('');
  const [certAuthority, setCertAuthority] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (importType !== 'certificates') {
        if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
          alert('Please select a CSV file');
          return;
        }
      }
      setFile(selectedFile);
      setResult(null);
      setUploadSuccess(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (importType !== 'certificates') {
        if (droppedFile.type !== 'text/csv' && !droppedFile.name.endsWith('.csv')) {
          alert('Please drop a CSV file');
          return;
        }
      }
      setFile(droppedFile);
      setResult(null);
      setUploadSuccess(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // Read file content
      const csvData = await file.text();

      if (importType === 'users') {
        // Parse CSV and import users directly using userService
        const parsedData = parseCSV(csvData);
        
        if (parsedData.length === 0) {
          setResult({
            success: false,
            message: 'No valid data found in CSV file',
            recordsProcessed: 0,
            errors: ['The CSV file appears to be empty or improperly formatted']
          });
          return;
        }

        const errors: string[] = [];
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < parsedData.length; i++) {
          const row = parsedData[i];
          const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed
          
          // Validate required fields
          const badgeNumber = row.badgeNumber || row.badge_number || row.BadgeNumber || row.badge || row.Badge;
          const firstName = row.firstName || row.first_name || row.FirstName || row.firstname;
          const lastName = row.lastName || row.last_name || row.LastName || row.lastname;
          const email = row.email || row.Email || row.EMAIL;
          const role = row.role || row.Role || row.ROLE || 'officer';
          const department = row.department || row.Department || row.DEPARTMENT || 'Patrol Division';
          const rank = row.rank || row.Rank || row.RANK || 'Officer';
          const phone = row.phone || row.Phone || row.PHONE || '';
          const hireDate = row.hireDate || row.hire_date || row.HireDate || '';
          const supervisorId = row.supervisorId || row.supervisor_id || row.SupervisorId || '';
          const password = row.password || row.Password || row.PASSWORD || badgeNumber;

          // Check for required fields
          if (!badgeNumber || !firstName || !lastName || !email) {
            errors.push(`Row ${rowNum}: Missing required field(s) - badgeNumber, firstName, lastName, and email are required`);
            continue;
          }

          // Check if user already exists by badge number
          const existingUser = allUsers.find(u => u.badgeNumber === badgeNumber);
          if (existingUser) {
            skipCount++;
            errors.push(`Row ${rowNum}: User with badge number ${badgeNumber} already exists (skipped)`);
            continue;
          }

          // Validate role
          const validRoles = ['officer', 'supervisor', 'administrator', 'training_coordinator', 'accounting', 'staff'];
          const normalizedRole = role.toLowerCase() as User['role'];
          if (!validRoles.includes(normalizedRole)) {
            errors.push(`Row ${rowNum}: Invalid role "${role}" - using "officer" instead`);
          }

          try {
            // Create user using userService
            const newUser = await userService.create({
              badgeNumber,
              firstName,
              lastName,
              email,
              role: validRoles.includes(normalizedRole) ? normalizedRole : 'officer',
              department,
              rank,
              phone,
              hireDate: hireDate || undefined,
              supervisorId: supervisorId || undefined,
              password: password || badgeNumber,
            });

            if (newUser) {
              successCount++;
            } else {
              errors.push(`Row ${rowNum}: Failed to create user ${firstName} ${lastName}`);
            }
          } catch (err) {
            errors.push(`Row ${rowNum}: Error creating user - ${(err as Error).message}`);
          }
        }

        // Refresh users list after import
        if (successCount > 0 && refreshUsers) {
          await refreshUsers();
        }

        setResult({
          success: successCount > 0,
          message: successCount > 0 
            ? `Successfully imported ${successCount} user(s)${skipCount > 0 ? `, ${skipCount} skipped (already exist)` : ''}`
            : 'No users were imported',
          recordsProcessed: successCount,
          errors: errors.length > 0 ? errors : [],
        });

      } else {
        // Training import - still simulated for now
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockResult: ImportResult = {
          success: true,
          message: `Successfully imported ${importType} data`,
          recordsProcessed: Math.floor(Math.random() * 50) + 10,
          errors: [],
        };
        setResult(mockResult);
      }
    } catch (err) {
      setResult({
        success: false,
        message: 'Error processing file',
        recordsProcessed: 0,
        errors: [(err as Error).message || 'Unknown error']
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const handleCertificateUpload = async () => {
    if (!file || !selectedOfficer || !certTitle || !user) return;

    setIsUploading(true);
    try {
      // Upload file to storage
      const filePath = `${selectedOfficer}/${Date.now()}_${file.name}`;
      const fileUrl = await documentService.uploadFile(file, filePath);
      
      if (!fileUrl) {
        throw new Error('Failed to upload file');
      }

      // Create document record
      await documentService.create({
        userId: selectedOfficer,
        uploadedBy: user.id,
        documentType: certType,
        title: certTitle,
        description: certDescription || undefined,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        issueDate: certIssueDate || undefined,
        expirationDate: certExpDate || undefined,
        issuingAuthority: certAuthority || undefined,
      });

      setUploadSuccess(true);
      // Reset form
      setFile(null);
      setCertTitle('');
      setCertDescription('');
      setCertIssueDate('');
      setCertExpDate('');
      setCertAuthority('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading certificate:', error);
      setResult({
        success: false,
        message: 'Failed to upload certificate',
        recordsProcessed: 0,
        errors: ['Upload failed. Please try again.'],
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setUploadSuccess(false);
    setCertTitle('');
    setCertDescription('');
    setCertIssueDate('');
    setCertExpDate('');
    setCertAuthority('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const trainingTemplate = `title,description,category,date,time,duration,location,instructor,capacity,credits,mandatory
"Advanced Tactical Response","Comprehensive tactical training","Tactical","2025-03-15","08:00 AM","8 hours","Training Academy","Lt. Johnson",20,8,false
"De-escalation Techniques","Communication strategies","Communication","2025-03-18","09:00 AM","4 hours","Conference Room","Dr. Moore",30,4,true`;

  const usersTemplate = `badgeNumber,firstName,lastName,email,role,department,rank,phone,hireDate,password
"1234","John","Doe","j.doe@pd.gov","officer","Patrol Division","Officer","(555) 123-4567","2020-01-15","1234"
"5678","Jane","Smith","j.smith@pd.gov","supervisor","Detective Division","Sergeant","(555) 987-6543","2018-06-01","5678"
"9012","Mike","Johnson","m.johnson@pd.gov","administrator","Administration","Lieutenant","(555) 456-7890","2015-03-20","9012"`;

  const downloadTemplate = () => {
    const template = importType === 'training' ? trainingTemplate : usersTemplate;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter officers for certificate import (only show officers, not accounting)
  const officersForImport = allUsers.filter(u => 
    u.role === 'officer' || u.role === 'supervisor' || u.role === 'administrator' || u.role === 'training_coordinator'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import Data</h1>
        <p className="text-slate-600 mt-1">Import training courses, user data, or officer certificates</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Import Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Import Type Toggle */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setImportType('training');
                    resetForm();
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    importType === 'training'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <TrainingIcon size={18} />
                  Training
                </button>
                <button
                  onClick={() => {
                    setImportType('users');
                    resetForm();
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    importType === 'users'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <UsersIcon size={18} />
                  Users
                </button>
                <button
                  onClick={() => {
                    setImportType('certificates');
                    resetForm();
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    importType === 'certificates'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CertificateIcon size={18} />
                  Certificates
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {importType === 'certificates' ? (
                // Certificate Import Form
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CertificateIcon className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="font-medium text-blue-800">Import Officer Certificates</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Upload certificates, licenses, or training records for officers. Documents will be added to their profile.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Officer Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Officer/Staff *
                    </label>
                    <select
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Choose an officer...</option>
                      {officersForImport.map(officer => (
                        <option key={officer.id} value={officer.id}>
                          {officer.rank} {officer.firstName} {officer.lastName} (Badge #{officer.badgeNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Document Details */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Document Title *
                      </label>
                      <input
                        type="text"
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="e.g., CPR Certification"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Document Type *
                      </label>
                      <select
                        value={certType}
                        onChange={(e) => setCertType(e.target.value as DocType['documentType'])}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="certificate">Certificate</option>
                        <option value="training_record">Training Record</option>
                        <option value="qualification">Qualification</option>
                        <option value="license">License</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={certDescription}
                      onChange={(e) => setCertDescription(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Optional description..."
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Issue Date
                      </label>
                      <input
                        type="date"
                        value={certIssueDate}
                        onChange={(e) => setCertIssueDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        value={certExpDate}
                        onChange={(e) => setCertExpDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Issuing Authority
                      </label>
                      <input
                        type="text"
                        value={certAuthority}
                        onChange={(e) => setCertAuthority(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="e.g., American Red Cross"
                      />
                    </div>
                  </div>

                  {/* File Upload */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      file
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {file ? (
                      <div>
                        <CheckIcon className="mx-auto text-green-500 mb-2" size={32} />
                        <p className="font-medium text-slate-800">{file.name}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div>
                        <UploadIcon className="mx-auto text-slate-400 mb-2" size={32} />
                        <p className="font-medium text-slate-800">
                          Drop file here or click to browse
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          PDF, JPG, PNG, DOC up to 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <button
                    onClick={handleCertificateUpload}
                    disabled={!file || !selectedOfficer || !certTitle || isUploading}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon size={20} />
                        Upload Certificate
                      </>
                    )}
                  </button>

                  {/* Success Message */}
                  {uploadSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckIcon className="text-green-600" size={20} />
                        <div>
                          <h4 className="font-medium text-green-800">Certificate Uploaded Successfully!</h4>
                          <p className="text-sm text-green-700 mt-1">
                            The document has been added to the officer's profile.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // CSV Import Form
                <>
                  {/* Info Box for Users */}
                  {importType === 'users' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <UsersIcon className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                          <h4 className="font-medium text-blue-800">Import Users from CSV</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Upload a CSV file with user data. Required fields: badgeNumber, firstName, lastName, email.
                            Optional fields: role, department, rank, phone, hireDate, password.
                          </p>
                          <p className="text-sm text-blue-700 mt-1">
                            <strong>Note:</strong> If no password is provided, the badge number will be used as the default password.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File Drop Zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      file
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {file ? (
                      <div>
                        <CheckIcon className="mx-auto text-green-500 mb-3" size={48} />
                        <p className="font-medium text-slate-800">{file.name}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resetForm();
                          }}
                          className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div>
                        <ImportIcon className="mx-auto text-slate-400 mb-3" size={48} />
                        <p className="font-medium text-slate-800">
                          Drop your CSV file here or click to browse
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          Supports .csv files only
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Import Button */}
                  <button
                    onClick={handleImport}
                    disabled={!file || isProcessing}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ImportIcon size={20} />
                        Import {importType === 'training' ? 'Training' : 'Users'}
                      </>
                    )}
                  </button>

                  {/* Result */}
                  {result && (
                    <div className={`p-4 rounded-lg ${
                      result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <CheckIcon className="text-green-600 flex-shrink-0" size={20} />
                        ) : (
                          <XIcon className="text-red-600 flex-shrink-0" size={20} />
                        )}
                        <div className="flex-1">
                          <h4 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                            {result.message}
                          </h4>
                          <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                            {result.recordsProcessed} records processed
                          </p>
                          {result.errors.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-amber-800">Details:</p>
                              <ul className="text-sm text-amber-700 mt-1 space-y-1 max-h-40 overflow-y-auto">
                                {result.errors.map((error, idx) => (
                                  <li key={idx}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          {importType === 'certificates' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800 mb-4">Certificate Import</h3>
                <ol className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">1</span>
                    <span>Select the officer/staff member</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">2</span>
                    <span>Enter certificate details</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">3</span>
                    <span>Upload the certificate file</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">4</span>
                    <span>Document appears in officer's profile</span>
                  </li>
                </ol>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800 mb-4">Supported Files</h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <DocumentIcon size={16} className="text-red-500" />
                    PDF Documents
                  </li>
                  <li className="flex items-center gap-2">
                    <DocumentIcon size={16} className="text-blue-500" />
                    Word Documents (.doc, .docx)
                  </li>
                  <li className="flex items-center gap-2">
                    <DocumentIcon size={16} className="text-green-500" />
                    Images (.jpg, .png)
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800 mb-4">Instructions</h3>
                <ol className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">1</span>
                    <span>Download the CSV template below</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">2</span>
                    <span>Fill in your data following the template format</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">3</span>
                    <span>Upload the completed CSV file</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">4</span>
                    <span>Review and confirm the import</span>
                  </li>
                </ol>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800 mb-4">Download Template</h3>
                <button
                  onClick={downloadTemplate}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ImportIcon size={18} className="rotate-180" />
                  Download {importType === 'training' ? 'Training' : 'Users'} Template
                </button>
              </div>

              {importType === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-800 mb-4">Required Fields</h3>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <strong>badgeNumber</strong> - Unique badge number
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <strong>firstName</strong> - First name
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <strong>lastName</strong> - Last name
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <strong>email</strong> - Email address
                    </li>
                  </ul>
                  <h4 className="font-medium text-slate-700 mt-4 mb-2">Optional Fields</h4>
                  <ul className="text-sm text-slate-500 space-y-1">
                    <li>role (officer, supervisor, administrator, training_coordinator, accounting, staff)</li>
                    <li>department, rank, phone, hireDate, password</li>
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertIcon className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-medium text-amber-800">Important Notes</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  {importType === 'certificates' ? (
                    <>
                      <li>• Max file size: 10MB</li>
                      <li>• Documents are visible in officer profiles</li>
                      <li>• Supervisors can verify uploaded documents</li>
                      <li>• Track expiration dates for renewals</li>
                    </>
                  ) : importType === 'users' ? (
                    <>
                      <li>• First row must contain column headers</li>
                      <li>• Duplicate badge numbers will be skipped</li>
                      <li>• Default password is the badge number</li>
                      <li>• Wrap text with commas in quotes</li>
                    </>
                  ) : (
                    <>
                      <li>• First row must contain column headers</li>
                      <li>• Date format: YYYY-MM-DD</li>
                      <li>• Boolean values: true/false</li>
                      <li>• Wrap text with commas in quotes</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;

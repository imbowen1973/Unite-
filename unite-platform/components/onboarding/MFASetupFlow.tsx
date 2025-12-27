'use client'

// MFA Setup Flow Component
// Guides users through multi-factor authentication setup

import { useState } from 'react'
import { Smartphone, Mail, Phone, Download, Check, Copy, AlertCircle } from 'lucide-react'
import { MFASetup } from '@/types/onboarding'

interface MFASetupFlowProps {
  guestUserId: string
  onComplete?: (backupCodes: string[]) => void
  onSkip?: () => void
}

export function MFASetupFlow({ guestUserId, onComplete, onSkip }: MFASetupFlowProps) {
  const [step, setStep] = useState<'method' | 'setup' | 'verify' | 'backup'>('method')
  const [selectedMethod, setSelectedMethod] = useState<MFASetup['method']>('authenticator-app')
  const [mfaSetup, setMfaSetup] = useState<MFASetup | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [downloadedBackup, setDownloadedBackup] = useState(false)

  const handleMethodSelect = (method: MFASetup['method']) => {
    setSelectedMethod(method)
  }

  const handleStartSetup = async () => {
    try {
      const response = await fetch('/api/onboarding/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          guestUserId,
          method: selectedMethod,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMfaSetup(data.mfaSetup)
        setStep('setup')
      } else {
        setError('Failed to start MFA setup')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/onboarding/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          guestUserId,
          code: verificationCode,
        }),
      })

      const data = await response.json()

      if (response.ok && data.verified) {
        setBackupCodes(data.backupCodes)
        setStep('backup')
      } else {
        setError('Invalid code. Please try again.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleCopySecret = () => {
    if (mfaSetup?.secretKey) {
      navigator.clipboard.writeText(mfaSetup.secretKey)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }
  }

  const handleDownloadBackupCodes = () => {
    const content = `Unite Platform - MFA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${backupCodes.join('\n')}\n\nIMPORTANT:\n- Store these codes in a safe place\n- Each code can only be used once\n- Use these if you lose access to your authenticator app\n`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `unite-mfa-backup-codes-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setDownloadedBackup(true)
  }

  const handleComplete = () => {
    onComplete?.(backupCodes)
  }

  const handleSkipMFA = () => {
    if (confirm('Are you sure you want to skip MFA setup? This makes your account less secure.')) {
      onSkip?.()
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Method Selection */}
      {step === 'method' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Multi-Factor Authentication</h2>
          <p className="text-gray-600 mb-6">
            Add an extra layer of security to your account. Choose your preferred method:
          </p>

          <div className="grid grid-cols-1 gap-4 mb-6">
            {/* Authenticator App */}
            <button
              onClick={() => handleMethodSelect('authenticator-app')}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                selectedMethod === 'authenticator-app'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${selectedMethod === 'authenticator-app' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                  <Smartphone className={`w-6 h-6 ${selectedMethod === 'authenticator-app' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Authenticator App</h3>
                  <p className="text-sm text-gray-600">
                    Use an app like Google Authenticator, Microsoft Authenticator, or Authy
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Recommended
                  </span>
                </div>
                {selectedMethod === 'authenticator-app' && (
                  <Check className="w-6 h-6 text-blue-500" />
                )}
              </div>
            </button>

            {/* SMS */}
            <button
              onClick={() => handleMethodSelect('sms')}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                selectedMethod === 'sms'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${selectedMethod === 'sms' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                  <Mail className={`w-6 h-6 ${selectedMethod === 'sms' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">SMS Text Message</h3>
                  <p className="text-sm text-gray-600">
                    Receive verification codes via SMS
                  </p>
                </div>
                {selectedMethod === 'sms' && (
                  <Check className="w-6 h-6 text-blue-500" />
                )}
              </div>
            </button>

            {/* Email */}
            <button
              onClick={() => handleMethodSelect('email')}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                selectedMethod === 'email'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${selectedMethod === 'email' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                  <Phone className={`w-6 h-6 ${selectedMethod === 'email' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-sm text-gray-600">
                    Receive verification codes via email
                  </p>
                </div>
                {selectedMethod === 'email' && (
                  <Check className="w-6 h-6 text-blue-500" />
                )}
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSkipMFA}
              className="text-gray-600 hover:text-gray-800"
            >
              Skip for now
            </button>
            <button
              onClick={handleStartSetup}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {step === 'setup' && mfaSetup && selectedMethod === 'authenticator-app' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan QR Code</h2>
          <p className="text-gray-600 mb-6">
            Use your authenticator app to scan this QR code
          </p>

          <div className="bg-white border-2 rounded-lg p-8 mb-6">
            <div className="flex flex-col items-center">
              {/* QR Code */}
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {mfaSetup.qrCode ? (
                  <img src={mfaSetup.qrCode} alt="QR Code" className="w-full h-full" />
                ) : (
                  <div className="text-gray-400">QR Code</div>
                )}
              </div>

              {/* Manual Entry */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded border">
                  <code className="text-sm font-mono">{mfaSetup.secretKey}</code>
                  <button
                    onClick={handleCopySecret}
                    className="text-blue-600 hover:text-blue-800"
                    title="Copy code"
                  >
                    {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Having trouble?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Make sure you have an authenticator app installed</li>
                  <li>Try Google Authenticator, Microsoft Authenticator, or Authy</li>
                  <li>Ensure your device's camera has permission to scan</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
          >
            I've Scanned the Code
          </button>
        </div>
      )}

      {/* Verify Code */}
      {step === 'verify' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Verification Code</h2>
          <p className="text-gray-600 mb-6">
            Enter the 6-digit code from your authenticator app
          </p>

          <div className="bg-white border-2 rounded-lg p-8 mb-6">
            <input
              type="text"
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-4xl font-mono tracking-widest border-b-2 border-gray-300 focus:border-blue-500 outline-none pb-4"
              autoFocus
              maxLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={verificationCode.length !== 6 || verifying}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      )}

      {/* Backup Codes */}
      {step === 'backup' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Save Your Backup Codes</h2>
          <p className="text-gray-600 mb-6">
            Store these codes in a safe place. You can use them to access your account if you lose your device.
          </p>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p className="font-medium">Important:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Each code can only be used once</li>
                  <li>Store them in a secure location (password manager, safe, etc.)</li>
                  <li>Don't share these codes with anyone</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-white p-4 rounded border">
              {backupCodes.map((code, index) => (
                <div key={index} className="font-mono text-sm py-2 px-3 bg-gray-50 rounded">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleDownloadBackupCodes}
            className="w-full mb-4 px-6 py-3 border-2 border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {downloadedBackup ? 'Downloaded!' : 'Download Backup Codes'}
          </button>

          <button
            onClick={handleComplete}
            disabled={!downloadedBackup}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {downloadedBackup ? 'Complete Setup' : 'Download codes to continue'}
          </button>
        </div>
      )}
    </div>
  )
}

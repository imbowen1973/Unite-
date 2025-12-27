'use client'

// Main Onboarding Workflow Component
// Orchestrates all onboarding steps for guest users

import { useState, useEffect } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import { GuestUser, OnboardingStep } from '@/types/onboarding'
import { OnboardingTour } from './OnboardingTour'
import { MFASetupFlow } from './MFASetupFlow'

interface OnboardingWorkflowProps {
  guestUserId: string
  onComplete?: () => void
}

export function OnboardingWorkflow({ guestUserId, onComplete }: OnboardingWorkflowProps) {
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null)
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGuestUser()
  }, [guestUserId])

  const loadGuestUser = async () => {
    try {
      const response = await fetch(`/api/onboarding/guest/${guestUserId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (response.ok) {
        const data = await response.json()
        setGuestUser(data.guestUser)
        const nextStep = data.guestUser.onboardingSteps.find(
          (s: OnboardingStep) => s.status === 'pending' || s.status === 'in-progress'
        )
        setCurrentStep(nextStep || data.guestUser.onboardingSteps[0])
      }
    } catch (error) {
      console.error('Failed to load guest user:', error)
    } finally {
      setLoading(false)
    }
  }

  const completeStep = async (stepId: string) => {
    try {
      await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ guestUserId, stepId }),
      })
      loadGuestUser()
    } catch (error) {
      console.error('Failed to complete step:', error)
    }
  }

  if (loading || !guestUser || !currentStep) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  // Render current step
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {guestUser.onboardingSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : step.id === currentStep.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.status === 'completed' ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                {index < guestUser.onboardingSteps.length - 1 && (
                  <div className={`w-16 h-1 ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600">
            Step {guestUser.onboardingSteps.findIndex(s => s.id === currentStep.id) + 1} of {guestUser.onboardingSteps.length}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep.type === 'welcome' && (
            <div>
              <h1 className="text-3xl font-bold mb-4">Welcome to Unite Platform!</h1>
              <p className="text-lg text-gray-600 mb-6">
                Hi {guestUser.displayName}, we're excited to have you join as a {guestUser.guestType.replace(/-/g, ' ')}.
              </p>
              <button
                onClick={() => completeStep('welcome')}
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Get Started <ArrowRight className="inline w-5 h-5 ml-2" />
              </button>
            </div>
          )}

          {currentStep.type === 'mfa' && (
            <MFASetupFlow
              guestUserId={guestUserId}
              onComplete={() => completeStep('mfa')}
              onSkip={() => completeStep('mfa')}
            />
          )}

          {currentStep.type === 'tour' && (
            <OnboardingTour
              guestType={guestUser.guestType}
              onComplete={() => completeStep('tour')}
              onSkip={() => completeStep('tour')}
            />
          )}

          {currentStep.type === 'complete' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4">All Set!</h2>
              <p className="text-gray-600 mb-6">You've completed the onboarding. Welcome aboard!</p>
              <button
                onClick={onComplete}
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

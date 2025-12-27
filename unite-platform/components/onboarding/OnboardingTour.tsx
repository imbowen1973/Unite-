'use client'

// Interactive Onboarding Tour Component
// Provides guided shepherd-style tour for guest users

import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { GuestUserType, ShepherdStep } from '@/types/onboarding'

interface OnboardingTourProps {
  guestType: GuestUserType
  onComplete?: () => void
  onSkip?: () => void
}

export function OnboardingTour({ guestType, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Define tour steps based on guest type
  const tourSteps = getTourSteps(guestType)
  const currentStep = tourSteps[currentStepIndex]

  useEffect(() => {
    if (!isActive) return

    // Highlight the target element
    if (currentStep.target) {
      const element = document.querySelector(currentStep.target) as HTMLElement
      if (element) {
        setHighlightedElement(element)

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Add highlight class
        element.classList.add('tour-highlight')

        // Position popover
        positionPopover(element)
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('tour-highlight')
      }
    }
  }, [currentStepIndex, isActive, currentStep])

  const positionPopover = (element: HTMLElement) => {
    if (!popoverRef.current) return

    const rect = element.getBoundingClientRect()
    const popover = popoverRef.current
    const attachTo = currentStep.attachTo?.on || 'bottom'

    let top, left

    switch (attachTo) {
      case 'top':
        top = rect.top - popover.offsetHeight - 20
        left = rect.left + rect.width / 2 - popover.offsetWidth / 2
        break
      case 'bottom':
        top = rect.bottom + 20
        left = rect.left + rect.width / 2 - popover.offsetWidth / 2
        break
      case 'left':
        top = rect.top + rect.height / 2 - popover.offsetHeight / 2
        left = rect.left - popover.offsetWidth - 20
        break
      case 'right':
        top = rect.top + rect.height / 2 - popover.offsetHeight / 2
        left = rect.right + 20
        break
      default:
        top = rect.bottom + 20
        left = rect.left + rect.width / 2 - popover.offsetWidth / 2
    }

    popover.style.top = `${top}px`
    popover.style.left = `${left}px`
  }

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleComplete = () => {
    setIsActive(false)
    onComplete?.()
  }

  const handleSkip = () => {
    setIsActive(false)
    onSkip?.()
  }

  if (!isActive) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" style={{ pointerEvents: 'none' }}>
        {/* Cutout for highlighted element */}
        {highlightedElement && (
          <div
            className="absolute border-4 border-blue-500 rounded-lg transition-all duration-300"
            style={{
              top: highlightedElement.getBoundingClientRect().top - 4,
              left: highlightedElement.getBoundingClientRect().left - 4,
              width: highlightedElement.getBoundingClientRect().width + 8,
              height: highlightedElement.getBoundingClientRect().height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Tour popover */}
      <div
        ref={popoverRef}
        className="fixed bg-white rounded-lg shadow-2xl z-50 max-w-md"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 w-8 rounded ${
                        index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {currentStepIndex + 1} of {tourSteps.length}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{currentStep.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 ml-4"
              title="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700">{currentStep.text}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Skip Tour
            </button>

            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {currentStepIndex === tourSteps.length - 1 ? (
                  <>
                    <Check className="w-4 h-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global styles for tour highlight */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 41 !important;
        }
      `}</style>
    </>
  )
}

/**
 * Get tour steps based on guest user type
 */
function getTourSteps(guestType: GuestUserType): ShepherdStep[] {
  const baseSteps: ShepherdStep[] = [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to Unite Platform!',
      text: 'Let me show you around the platform and help you get started. This tour will take about 2 minutes.',
      attachTo: {
        element: 'body',
        on: 'bottom',
      },
    },
    {
      id: 'navigation',
      target: 'nav',
      title: 'Navigation Menu',
      text: 'Use this menu to navigate between different sections of the platform: Home, Meetings, Documents, and your Profile.',
      attachTo: {
        element: 'nav',
        on: 'bottom',
      },
    },
    {
      id: 'meetings',
      target: '[href="/meetings"]',
      title: 'Your Meetings',
      text: 'View all your upcoming meetings, access agendas, and review past minutes. You\'ll receive notifications before each meeting.',
      attachTo: {
        element: '[href="/meetings"]',
        on: 'right',
      },
    },
    {
      id: 'documents',
      target: '[href="/documents"]',
      title: 'Document Library',
      text: 'Access meeting documents, policies, and other resources. Documents are organized by committee and meeting.',
      attachTo: {
        element: '[href="/documents"]',
        on: 'right',
      },
    },
    {
      id: 'profile',
      target: '[data-tour="profile"]',
      title: 'Your Profile',
      text: 'Manage your profile, security settings, and preferences here. You can also configure multi-factor authentication.',
      attachTo: {
        element: '[data-tour="profile"]',
        on: 'bottom',
      },
    },
  ]

  // Add guest-type specific steps
  switch (guestType) {
    case 'external-committee-member':
    case 'co-opted-member':
      baseSteps.push({
        id: 'voting',
        target: '[data-tour="voting"]',
        title: 'Voting in Meetings',
        text: 'When agenda items require a vote, you\'ll be able to cast your vote electronically during or after the meeting.',
        attachTo: {
          element: '[data-tour="voting"]',
          on: 'bottom',
        },
      })
      break

    case 'observer':
      baseSteps.push({
        id: 'observer-note',
        target: 'body',
        title: 'Observer Access',
        text: 'As an observer, you can view meetings and documents but cannot vote or contribute agenda items. You may be invited to speak on specific topics.',
        attachTo: {
          element: 'body',
          on: 'bottom',
        },
      })
      break

    case 'student-rep':
      baseSteps.push({
        id: 'student-voice',
        target: '[data-tour="contribute"]',
        title: 'Student Voice',
        text: 'You can suggest agenda items and raise student concerns through the platform. Your contributions are valued and important.',
        attachTo: {
          element: '[data-tour="contribute"]',
          on: 'bottom',
        },
      })
      break
  }

  // Final step
  baseSteps.push({
    id: 'complete',
    target: 'body',
    title: 'You\'re All Set!',
    text: 'You\'ve completed the tour. Feel free to explore the platform. If you need help, click the support button in the bottom right corner.',
    attachTo: {
      element: 'body',
      on: 'bottom',
    },
  })

  return baseSteps
}

// Onboarding component using Shepherd.js for the Unite Platform

'use client';

import React, { useEffect, useState } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

interface Step {
  id: string;
  title: string;
  text: string;
  attachTo?: {
    element: string;
    on: string;
  };
  beforeShowPromise?: () => Promise<void>;
  canBePaused?: boolean;
  cancelIcon?: {
    enabled: boolean;
  };
  classes?: string;
  copyStyles?: boolean;
  floating?: boolean;
  scrollTo?: boolean | ScrollIntoViewOptions;
  when?: {
    [key: string]: () => void;
  };
}

interface OnboardingProps {
  steps: Step[];
  tourName: string;
  userId?: string;
}

const Onboarding: React.FC<OnboardingProps> = ({ steps, tourName, userId }) => {
  const [tour, setTour] = useState<Shepherd.Tour | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Initialize Shepherd tour
    const initTour = new Shepherd.Tour({
      defaultStepOptions: {
        classes: 'shadow-lg bg-white',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
          enabled: true
        }
      },
      useModalOverlay: true,
      tourName: tourName
    });

    // Add steps to the tour
    steps.forEach((step) => {
      initTour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        attachTo: step.attachTo,
        beforeShowPromise: step.beforeShowPromise,
        canBePaused: step.canBePaused,
        cancelIcon: step.cancelIcon,
        classes: step.classes,
        copyStyles: step.copyStyles,
        floating: step.floating,
        scrollTo: step.scrollTo,
        when: step.when
      });
    });

    // Add event listeners
    initTour.on('start', () => {
      setActive(true);
      trackEvent('onboarding_started', { tourName, userId });
    });

    initTour.on('complete', () => {
      setActive(false);
      trackEvent('onboarding_completed', { tourName, userId });
    });

    initTour.on('cancel', () => {
      setActive(false);
      trackEvent('onboarding_cancelled', { tourName, userId });
    });

    initTour.on('show', () => {
      trackEvent('onboarding_step_shown', { 
        tourName, 
        userId, 
        stepId: initTour.getCurrentStep()?.id 
      });
    });

    setTour(initTour);

    // Cleanup
    return () => {
      if (initTour) {
        initTour.destroy();
      }
    };
  }, [steps, tourName, userId]);

  const startTour = () => {
    if (tour) {
      tour.start();
      trackEvent('onboarding_started', { tourName, userId });
    }
  };

  const completeTour = () => {
    if (tour) {
      tour.complete();
    }
  };

  // Function to track onboarding events
  const trackEvent = (action: string, properties: any) => {
    // In a real implementation, this would send data to an analytics service
    console.log('Onboarding Event:', { action, properties, timestamp: new Date().toISOString() });
    
    // Log to audit system
    if (typeof window !== 'undefined') {
      // Send to audit service
      fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          actor: userId || 'anonymous',
          payload: properties,
          timestamp: new Date().toISOString()
        })
      }).catch(error => {
        console.error('Error logging onboarding event:', error);
      });
    }
  };

  return (
    <div className="onboarding-container">
      {active && (
        <div className="fixed top-4 right-4 z-50 bg-blue-100 text-blue-800 px-4 py-2 rounded-md shadow-lg">
          Onboarding in progress...
        </div>
      )}
      <button
        onClick={startTour}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Start Tour
      </button>
    </div>
  );
};

export default Onboarding;

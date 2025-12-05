/**
 * Stepper
 *
 * Multi-step form/wizard component.
 * GAP: Not available in @mdxui/html.
 */

import * as React from 'react'
import { Stepper as MantineStepper, Button, Group } from '@mantine/core'
import type { StepperProps } from '../types'

export interface StepperWithControlsProps extends StepperProps {
  /** Allow navigating to previous steps */
  allowStepClick?: boolean
  /** Show next/back buttons */
  showControls?: boolean
  /** On complete callback */
  onComplete?: () => void
  /** Custom labels */
  labels?: {
    back?: string
    next?: string
    complete?: string
  }
}

export function StepperWithControls({
  active,
  onStepClick,
  orientation = 'horizontal',
  steps,
  allowStepClick = true,
  showControls = true,
  onComplete,
  labels = {},
}: StepperWithControlsProps) {
  const [currentStep, setCurrentStep] = React.useState(active)

  const nextStep = () =>
    setCurrentStep((current) => (current < steps.length ? current + 1 : current))
  const prevStep = () =>
    setCurrentStep((current) => (current > 0 ? current - 1 : current))

  const handleStepClick = (step: number) => {
    if (allowStepClick && step <= currentStep) {
      setCurrentStep(step)
      onStepClick?.(step)
    }
  }

  const isComplete = currentStep === steps.length

  React.useEffect(() => {
    setCurrentStep(active)
  }, [active])

  return (
    <div>
      <MantineStepper
        active={currentStep}
        onStepClick={handleStepClick}
        orientation={orientation}
      >
        {steps.map((step, index) => (
          <MantineStepper.Step
            key={index}
            label={step.label}
            description={step.description}
            icon={step.icon}
          >
            {step.content}
          </MantineStepper.Step>
        ))}
        <MantineStepper.Completed>
          <div className="py-8 text-center">
            <h3 className="text-lg font-semibold">All steps completed!</h3>
            <p className="mt-2 text-muted-foreground">
              You have successfully completed all steps.
            </p>
          </div>
        </MantineStepper.Completed>
      </MantineStepper>

      {showControls && (
        <Group justify="center" mt="xl">
          {currentStep > 0 && !isComplete && (
            <Button variant="default" onClick={prevStep}>
              {labels.back || 'Back'}
            </Button>
          )}
          {!isComplete && (
            <Button onClick={nextStep}>
              {currentStep === steps.length - 1
                ? labels.complete || 'Complete'
                : labels.next || 'Next'}
            </Button>
          )}
          {isComplete && onComplete && (
            <Button onClick={onComplete}>Done</Button>
          )}
        </Group>
      )}
    </div>
  )
}

/**
 * Simple Stepper without controls
 */
export function Stepper({
  active,
  onStepClick,
  orientation = 'horizontal',
  steps,
}: StepperProps) {
  return (
    <MantineStepper
      active={active}
      onStepClick={onStepClick}
      orientation={orientation}
    >
      {steps.map((step, index) => (
        <MantineStepper.Step
          key={index}
          label={step.label}
          description={step.description}
          icon={step.icon}
        >
          {step.content}
        </MantineStepper.Step>
      ))}
    </MantineStepper>
  )
}

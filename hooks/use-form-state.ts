import { useState, useCallback } from 'react'

interface UseFormStateOptions<T> {
  initialValues: T
  onSubmit?: (values: T) => Promise<void> | void
  validate?: (values: T) => Record<string, string> | null
}

export function useFormState<T extends Record<string, any>>(options: UseFormStateOptions<T>) {
  const { initialValues, onSubmit, validate } = options
  
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
    }
  }, [errors])

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
    setSubmitError(null)
  }, [])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(false)
  }, [initialValues])

  const validateForm = useCallback(() => {
    if (!validate) return true
    
    const validationErrors = validate(values)
    if (validationErrors) {
      setErrors(validationErrors)
      return false
    }
    
    setErrors({})
    return true
  }, [validate, values])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      await onSubmit?.(values)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setSubmitError(errorMessage)
      throw error // Re-throw so calling component can handle it
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, onSubmit, values])

  const updateValues = useCallback((updates: Partial<T>) => {
    setValues(prev => ({ ...prev, ...updates }))
  }, [])

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    setValue,
    setFieldError,
    clearErrors,
    reset,
    handleSubmit,
    updateValues,
    validateForm,
  }
} 
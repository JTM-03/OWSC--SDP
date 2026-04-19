/**
 * Custom React Hook for Form Sanitization
 * Automatically sanitizes form inputs as they change
 */

import { useState, useCallback } from 'react';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeFormData,
} from '../utils/sanitize';

interface FieldConfig {
  type: 'email' | 'phone' | 'string' | 'number' | 'boolean';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

interface FormConfig {
  [fieldName: string]: FieldConfig;
}

interface FormErrors {
  [fieldName: string]: string;
}

/**
 * Hook for managing form state with automatic sanitization
 */
export const useSanitizedForm = <T extends Record<string, any>>(
  initialValues: T,
  fieldConfig?: FormConfig,
  onSubmit?: (values: T) => void | Promise<void>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Sanitize a single field value based on its type
   */
  const sanitizeField = useCallback(
    (fieldName: string, value: any): any => {
      const config = fieldConfig?.[fieldName];
      const fieldType = config?.type || 'string';

      switch (fieldType) {
        case 'email':
          return sanitizeEmail(value);
        case 'phone':
          return sanitizePhone(value);
        case 'number':
          return sanitizeNumber(value);
        case 'boolean':
          return sanitizeBoolean(value);
        case 'string':
        default:
          return sanitizeString(value);
      }
    },
    [fieldConfig]
  );

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (fieldName: string, value: any): string | null => {
      const config = fieldConfig?.[fieldName];

      if (!config) return null;

      // Check required
      if (config.required && !value) {
        return `${fieldName} is required`;
      }

      // Check string length
      if (typeof value === 'string') {
        if (config.minLength && value.length < config.minLength) {
          return `${fieldName} must be at least ${config.minLength} characters`;
        }
        if (config.maxLength && value.length > config.maxLength) {
          return `${fieldName} must not exceed ${config.maxLength} characters`;
        }
      }

      return null;
    },
    [fieldConfig]
  );

  /**
   * Handle input change with sanitization
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      let sanitizedValue = value;

      // Sanitize based on field type
      if (type === 'checkbox') {
        sanitizedValue = (e.target as HTMLInputElement).checked;
      } else if (type === 'number') {
        sanitizedValue = sanitizeNumber(value);
      } else {
        sanitizedValue = sanitizeField(name, value);
      }

      // Update values
      setValues((prev) => ({
        ...prev,
        [name]: sanitizedValue,
      }));

      // Validate if field has been touched
      if (touched[name]) {
        const error = validateField(name, sanitizedValue);
        setErrors((prev) => ({
          ...prev,
          [name]: error || '',
        }));
      }
    },
    [sanitizeField, validateField, touched]
  );

  /**
   * Handle field blur
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      // Mark field as touched
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      // Validate field
      const error = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error || '',
      }));
    },
    [validateField]
  );

  /**
   * Validate all fields
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    for (const [fieldName, value] of Object.entries(values)) {
      const error = validateField(fieldName, value);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        if (onSubmit) {
          await onSubmit(values);
        }
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateForm, values, onSubmit]
  );

  /**
   * Reset form to initial values
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Set field value programmatically
   */
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    const sanitizedValue = sanitizeField(fieldName, value);
    setValues((prev) => ({
      ...prev,
      [fieldName]: sanitizedValue,
    }));
  }, [sanitizeField]);

  /**
   * Set field error programmatically
   */
  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    validateForm,
  };
};

/**
 * Hook for sanitizing form data before API submission
 */
export const useSanitizeBeforeSubmit = () => {
  const sanitize = useCallback((data: Record<string, any>, fieldConfig?: FormConfig) => {
    return sanitizeFormData(data, fieldConfig);
  }, []);

  return { sanitize };
};

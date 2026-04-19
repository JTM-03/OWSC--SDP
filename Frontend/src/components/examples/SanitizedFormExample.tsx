/**
 * Example Component: Sanitized Form
 * Demonstrates how to use the sanitization utilities and hooks
 */

import React from 'react';
import { useSanitizedForm } from '../../hooks/useSanitizedForm';
import { isValidEmail, isValidPhone, isStrongPassword, getPasswordStrength } from '../../utils/sanitize';

interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  confirmPassword: string;
  address: string;
}

const SanitizedFormExample: React.FC = () => {
  const initialValues: RegisterFormData = {
    fullName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    address: '',
  };

  const fieldConfig = {
    fullName: { type: 'string' as const, required: true, minLength: 2 },
    email: { type: 'email' as const, required: true },
    phone: { type: 'string' as const, required: true },
    username: { type: 'string' as const, required: true, minLength: 3 },
    password: { type: 'string' as const, required: true, minLength: 8 },
    confirmPassword: { type: 'string' as const, required: true },
    address: { type: 'string' as const },
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
  } = useSanitizedForm<RegisterFormData>(initialValues, fieldConfig, async (formData) => {
    // Additional validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (!isValidEmail(formData.email)) {
      alert('Invalid email format');
      return;
    }

    if (!isValidPhone(formData.phone)) {
      alert('Invalid phone format (use 07XXXXXXXX)');
      return;
    }

    if (!isStrongPassword(formData.password)) {
      alert('Password is not strong enough');
      return;
    }

    // Submit to API
    console.log('Submitting sanitized form data:', formData);
    // await api.post('/auth/register', formData);
  });

  const passwordStrength = getPasswordStrength(values.password);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Register</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={values.fullName}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-md ${
              touched.fullName && errors.fullName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John Doe"
          />
          {touched.fullName && errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-md ${
              touched.email && errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john@example.com"
          />
          {touched.email && errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
          {values.email && !isValidEmail(values.email) && (
            <p className="text-yellow-600 text-sm mt-1">Invalid email format</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={values.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-md ${
              touched.phone && errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0712345678"
          />
          {touched.phone && errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
          {values.phone && !isValidPhone(values.phone) && (
            <p className="text-yellow-600 text-sm mt-1">Use format: 07XXXXXXXX</p>
          )}
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={values.username}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-md ${
              touched.username && errors.username ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="johndoe"
          />
          {touched.username && errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-md ${
              touched.password && errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="••••••••"
          />
          {values.password && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Strength:</span>
                <div className="flex gap-1">
                  <div
                    className={`h-2 w-8 rounded ${
                      passwordStrength ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  />
                  <div
                    className={`h-2 w-8 rounded ${
                      passwordStrength === 'strong' || passwordStrength === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-gray-300'
                    }`}
                  />
                  <div
                    className={`h-2 w-8 rounded ${
                      passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                </div>
                <span className="text-sm capitalize">{passwordStrength}</span>
              </div>
            </div>
          )}
          {touched.password && errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-md ${
              touched.confirmPassword && errors.confirmPassword
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            placeholder="••••••••"
          />
          {values.confirmPassword &&
            values.password !== values.confirmPassword && (
              <p className="text-yellow-600 text-sm mt-1">Passwords do not match</p>
            )}
          {touched.confirmPassword && errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Address (Optional)
          </label>
          <textarea
            id="address"
            name="address"
            value={values.address}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-md ${
              touched.address && errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="123 Main Street"
            rows={3}
          />
          {touched.address && errors.address && (
            <p className="text-red-500 text-sm mt-1">{errors.address}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-md hover:bg-gray-400"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Debug Info */}
      <details className="mt-6 p-3 bg-gray-100 rounded text-sm">
        <summary className="cursor-pointer font-semibold">Debug: Form Data</summary>
        <pre className="mt-2 overflow-auto">{JSON.stringify(values, null, 2)}</pre>
      </details>
    </div>
  );
};

export default SanitizedFormExample;

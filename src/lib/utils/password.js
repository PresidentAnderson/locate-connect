/**
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {string | null}
 */
export function validatePasswordReset(password, confirmPassword) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match";
  }

  return null;
}

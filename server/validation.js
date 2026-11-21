const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

function validateUser({ name, email, address, password }, requirePassword = true) {
  const errors = {};
  if (!name || name.trim().length < 20 || name.trim().length > 60) errors.name = 'Name must be 20–60 characters.';
  if (!EMAIL.test(email || '')) errors.email = 'Enter a valid email address.';
  if (!address || address.length > 400) errors.address = 'Address is required and must be at most 400 characters.';
  if (requirePassword && !PASSWORD.test(password || '')) errors.password = 'Password must be 8–16 characters and include an uppercase letter and special character.';
  return errors;
}

module.exports = { validateUser, PASSWORD };

// One-off migration to reset government, admin, and business account passwords.
// New passwords: Government@2026 / Admin@2026 / Business@2026
// Run: npm run migrate  (or automatically on Railway deploy via npm run start:migrate)
export const up = async (queryInterface) => {
  await queryInterface.sequelize.query(`
    UPDATE users SET password = '$2b$10$ZCg4STsqR4FWsfxMVypAMOiyQJXBEHic7WISmP3H9yeKZYAc5vKsq' WHERE email = 'government@uchqun.uz';
    UPDATE users SET password = '$2b$10$nZeNyPNw/RyFGsivbBpPHusE5grDTu51i6p.AxyGeU2LdiljvIsPq' WHERE email = 'admin@uchqun.uz';
    UPDATE users SET password = '$2b$10$Z/cV7EPAtvsCOypRxMH8HOFuZukT/36t1EIVe7InlZRrO1CvrlsF.' WHERE email = 'business@uchqun.uz';
  `);
};

export const down = async () => {
  // Intentionally empty — password resets are not reversible
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Change avatar column from VARCHAR(255) to TEXT to fit base64 data URIs
    // (Railway has ephemeral storage, so we store images directly in the DB.)
    await queryInterface.changeColumn('users', 'avatar', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'avatar', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};

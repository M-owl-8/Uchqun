export async function up(queryInterface) {
  await queryInterface.addIndex('government_stats', ['statType', 'period'], {
    name: 'government_stats_stat_type_period',
  });
  await queryInterface.addIndex('government_stats', ['region', 'statType'], {
    name: 'government_stats_region_stat_type',
  });
  await queryInterface.addIndex('government_stats', ['school_id', 'statType'], {
    name: 'government_stats_school_id_stat_type',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('government_stats', 'government_stats_stat_type_period');
  await queryInterface.removeIndex('government_stats', 'government_stats_region_stat_type');
  await queryInterface.removeIndex('government_stats', 'government_stats_school_id_stat_type');
}

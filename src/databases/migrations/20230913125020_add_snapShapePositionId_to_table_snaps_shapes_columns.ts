import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('snaps_shapes_columns', table => {
    table
      .bigInteger('snapShapePositionId')
      .unsigned()
      .index()
      .references('id')
      .inTable('snaps_shapes_positions')
      .onDelete('CASCADE')
      .notNullable()
      .defaultTo(1)
      .after('snapShapeRowId');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('snaps_shapes_columns', table => {
    table.dropForeign(['snapShapePositionId']);
    table.dropColumn('snapShapePositionId');
  });
}

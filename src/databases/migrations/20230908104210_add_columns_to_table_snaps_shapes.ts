import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('snaps_shapes', table => {
    table.integer('columns').unsigned().notNullable().defaultTo(0).after('focusedIconKey');
    table.integer('rows').unsigned().notNullable().defaultTo(0).after('columns');
    table.integer('spacing').unsigned().notNullable().defaultTo(1).after('rows');
    table.integer('width').unsigned().notNullable().defaultTo(0).after('spacing');
    table.integer('height').unsigned().notNullable().defaultTo(0).after('width');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('snaps_shapes', table => {
    table.dropColumn('width');
    table.dropColumn('height');
  });
}

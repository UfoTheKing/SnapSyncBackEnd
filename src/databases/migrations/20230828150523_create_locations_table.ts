import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('locations', table => {
    table.charset('utf8mb4');

    table.bigIncrements('id').unsigned().primary();
    table.string('name', 255).notNullable();
    table.string('shortName', 255).notNullable();

    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();

    table.string('address', 255).notNullable();
    table.string('city', 255).notNullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('locations');
}

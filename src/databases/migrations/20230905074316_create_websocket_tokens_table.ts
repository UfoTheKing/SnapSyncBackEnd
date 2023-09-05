import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('websocket_tokens', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.string('token', 255).notNullable().unique();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('websocket_tokens');
}

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications_tickets', table => {
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('notificationId').unsigned().index().references('id').inTable('notifications').onDelete('CASCADE').notNullable();
    table.string('expoTicketId').notNullable();
    table.string('expoPushToken').notNullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('notifications_tickets');
}

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.string('phoneNumberOnlyDigits').notNullable().after('phoneNumber');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('phoneNumberOnlyDigits');
  });
}

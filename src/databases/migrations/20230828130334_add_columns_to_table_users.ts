import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', table => {
    table.specificType('phoneNumberCountryIso2', 'char(2)').nullable().defaultTo(null).after('phoneNumberOnlyDigits');

    table.decimal('latitude', 10, 8).nullable().defaultTo(null).after('phoneNumberCountryIso2'); // Indica la latitudine del luogo in cui l'utente si è registrato
    table.decimal('longitude', 11, 8).nullable().defaultTo(null).after('latitude'); // Indica la longitudine del luogo in cui l'utente si è registrato
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', table => {
    table.dropColumn('phoneNumberCountryIso2');
    table.dropColumn('latitude');
    table.dropColumn('longitude');
  });
}

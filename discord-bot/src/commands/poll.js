'use strict';

const { SlashCommandBuilder, PollLayoutType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crée un sondage.')
    .addStringOption((o) =>
      o.setName('question').setDescription('La question du sondage.').setRequired(true).setMaxLength(300),
    )
    .addStringOption((o) =>
      o.setName('options').setDescription('Réponses séparées par « ; » (2 à 10).').setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName('duree')
        .setDescription('Durée en heures (1 à 768, défaut 24).')
        .setMinValue(1)
        .setMaxValue(768),
    )
    .addBooleanOption((o) =>
      o.setName('multi').setDescription('Autoriser plusieurs réponses (défaut non).'),
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const raw = interaction.options.getString('options');
    const duration = interaction.options.getInteger('duree') ?? 24;
    const multi = interaction.options.getBoolean('multi') ?? false;

    const answers = raw
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (answers.length < 2) {
      await interaction.reply({
        content: 'Indiquez au moins 2 réponses, séparées par « ; ».',
        flags: require('discord.js').MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      poll: {
        question: { text: question },
        answers: answers.map((text) => ({ text })),
        duration,
        allowMultiselect: multi,
        layoutType: PollLayoutType.Default,
      },
    });
  },
};

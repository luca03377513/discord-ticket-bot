const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === 'open_ticket_btn') {
        const modal = new ModalBuilder()
          .setCustomId('ticket_modal')
          .setTitle('Source Code Access Request');

        const input = new TextInputBuilder()
          .setCustomId('purchase_method')
          .setLabel('What are you buying with?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g., Crypto, PayPal, Bank Transfer')
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(input);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'ticket_modal') {
        const purchaseMethod = interaction.fields.getTextInputValue('purchase_method');
        const guild = interaction.guild;
        const user = interaction.user;

        const ticketChannel = await guild.channels.create({
          name: `ticket-${user.username}-${Date.now().toString().slice(-6)}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
              id: ADMIN_ROLE_ID,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
            },
          ],
        });

        const embed = new EmbedBuilder()
          .setColor(0x2f3136)
          .addFields(
            { name: 'Buying with', value: purchaseMethod, inline: false }
          );

        const closeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [embed], components: [closeButton] });

        await interaction.reply({
          content: `Ticket created! Check ${ticketChannel}`,
          ephemeral: true,
        });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        const member = interaction.member;
        const hasAdminRole = member.roles.cache.has(ADMIN_ROLE_ID);

        if (!hasAdminRole && interaction.user.id !== interaction.guild.ownerId) {
          return await interaction.reply({
            content: 'Only admins can close tickets.',
            ephemeral: true,
          });
        }

        await interaction.reply({
          content: 'Closing ticket in 5 seconds...',
          ephemeral: true,
        });

        setTimeout(async () => {
          await interaction.channel.delete();
        }, 5000);
      }
    }

    if (interaction.isCommand()) {
      if (interaction.commandName === 'setup') {
        const isOwner = interaction.user.id === interaction.guild.ownerId;

        if (!isOwner) {
          return await interaction.reply({
            content: 'Only the server owner can use this command.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('Source Code Access')
          .setDescription('Click the button below to open a ticket and request source code access.');

        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('open_ticket_btn')
            .setLabel('Open Ticket to Buy Source Access')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [button] });

        await interaction.reply({
          content: 'Ticket system setup complete.',
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'An error occurred.',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'An error occurred.',
        ephemeral: true,
      });
    }
  }
});

client.on('ready', async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  try {
    await guild.commands.create({
      name: 'setup',
      description: 'Setup the ticket system (Owner only)',
    });
    console.log('Slash command registered');
  } catch (error) {
    console.error('Error registering command:', error);
  }
});

client.login(TOKEN);
console.log('Discord bot is starting...');

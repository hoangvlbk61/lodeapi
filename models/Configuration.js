const mongoose = require('mongoose');

const configurationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    replaceRules: [
      {
        id: {
          type: Number,
          required: true,
        },
        oldChar: {
          type: String,
          required: true,
          trim: true,
        },
        newChar: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to apply replace rules to text
configurationSchema.methods.applyReplaceRules = function (text) {
  let result = text;
  
  // Sort rules by id to ensure consistent order
  const sortedRules = [...this.replaceRules].sort((a, b) => a.id - b.id);
  
  for (const rule of sortedRules) {
    if (rule.oldChar && rule.newChar) {
      // Use global replacement
      const regex = new RegExp(rule.oldChar, 'g');
      result = result.replace(regex, rule.newChar);
    }
  }
  
  return result;
};

const Configuration = mongoose.model('Configuration', configurationSchema);

module.exports = Configuration;
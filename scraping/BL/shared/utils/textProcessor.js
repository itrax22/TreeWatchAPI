class TextProcessor {
    constructor() {
        // Hebrew characters range (including final letters)
        this.hebrewRange = /[\u0590-\u05FF]/;

        // Number pattern
        this.numberPattern = /^\d+$/;

        // Special characters pattern
        this.specialCharactersPattern = /^[!@#$%^&*(),.?":{}|<>\s]+$/;

        // Special characters that should not be reversed
        this.preserveCharacters = /[!@#$%^&*(),.?":{}|<>]/;
    }

    reverseHebrewText(text) {
        if (!text) return '';

        return text.split('\n')
            .map(line => this.processLine(line))
            .join('\n');
    }

    processLine(line) {
        if (!line.trim()) return line;

        // Skip processing if the line only contains special characters
        if (this.specialCharactersPattern.test(line)) return line;

        // Only process if line contains Hebrew
        if (!this.containsHebrew(line)) return line;

        // Split the line into words while preserving spaces
        const parts = line.match(/\S+|\s+/g) || [];

        // Separate Hebrew words, numbers, and other content
        const hebrewWords = [];
        const numbers = [];
        const otherContent = [];
        const spaces = [];

        parts.forEach(part => {
            if (/^\s+$/.test(part)) {
                spaces.push(part);
            } else if (this.numberPattern.test(part)) {
                numbers.push(part);
            } else if (this.containsHebrew(part)) {
                hebrewWords.push(this.processWord(part));
            } else {
                otherContent.push(part);
            }
        });

        // Reverse the order of Hebrew words
        hebrewWords.reverse();

        // Reconstruct the line: Hebrew words first, then numbers, then other content
        let result = [];

        if (hebrewWords.length > 0) {
            result = result.concat(hebrewWords);
        }

        if (numbers.length > 0) {
            if (result.length > 0) result.push(' ');
            result = result.concat(numbers);
        }

        if (otherContent.length > 0) {
            if (result.length > 0) result.push(' ');
            result = result.concat(otherContent);
        }

        return result.join(' ').trim();
    }

    processWord(word) {
        // Don't process whitespace
        if (/^\s+$/.test(word)) return word;

        // Split word into characters
        const chars = Array.from(word);

        // Process only if contains Hebrew characters
        if (chars.some(char => this.hebrewRange.test(char))) {
            const processed = [];
            let hebrewSequence = [];

            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];

                if (this.hebrewRange.test(char) || !this.preserveCharacters.test(char)) {
                    hebrewSequence.push(char);
                } else {
                    if (hebrewSequence.length > 0) {
                        processed.push(...this.reverseAndFinalize(hebrewSequence));
                        hebrewSequence = [];
                    }
                    processed.push(char);
                }
            }

            // Handle remaining Hebrew sequence
            if (hebrewSequence.length > 0) {
                processed.push(...this.reverseAndFinalize(hebrewSequence));
            }

            return processed.join('');
        }

        return word;
    }

    reverseAndFinalize(sequence) {
        // Reverse the sequence
        return sequence.reverse();
    }

    containsHebrew(text) {
        return this.hebrewRange.test(text);
    }
}

module.exports = { TextProcessor };



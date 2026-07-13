/**
 * Convertit un nombre décimal en toutes lettres en français (France).
 * Adapté pour l'écriture des montants sur les reçus fiscaux (ex: "cent vingt-cinq euros et cinquante centimes").
 */
export function numberToFrenchWords(amount: number): string {
  const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    let result = '';

    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
      if (hundreds === 1) {
        result += 'cent';
      } else {
        result += units[hundreds] + ' cent';
        if (remainder === 0) {
          result += 's'; // ex: deux cents
        }
      }
    }

    if (remainder > 0) {
      if (result) result += ' ';

      if (remainder < 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const ten = Math.floor(remainder / 10);
        const unit = remainder % 10;

        if (ten === 7) {
          if (unit === 1) {
            result += 'soixante et onze';
          } else {
            result += 'soixante-' + teens[unit];
          }
        } else if (ten === 9) {
          if (unit === 1) {
            result += 'quatre-vingt-onze';
          } else {
            result += 'quatre-vingt-' + teens[unit];
          }
        } else {
          result += tens[ten];
          if (unit > 0) {
            if (unit === 1) {
              result += ' et un';
            } else {
              result += '-' + units[unit];
            }
          }
        }
      }
    }

    // Ajustement de l'accord pour quatre-vingts quand il termine le nombre
    if (remainder === 80) {
      // "quatre-vingts" a déjà le 's' dans le tableau tens
    } else if (Math.floor(remainder / 10) === 8 && remainder > 80) {
      // Enlever le 's' pour quatre-vingt-un, quatre-vingt-deux, etc.
      const unit = remainder % 10;
      if (unit === 1) {
        result = 'quatre-vingt-un';
      } else {
        result = 'quatre-vingt-' + units[unit];
      }
    }

    return result;
  }

  // Si le montant est exactement 0
  if (amount === 0) return 'zéro euro';

  const parts = Math.abs(amount).toFixed(2).split('.');
  const euros = parseInt(parts[0], 10);
  const cents = parseInt(parts[1], 10);

  let eurosText = '';

  if (euros === 0) {
    eurosText = 'zéro euro';
  } else {
    const billion = Math.floor(euros / 1000000000);
    const million = Math.floor((euros % 1000000000) / 1000000);
    const thousand = Math.floor((euros % 1000000) / 1000);
    const unitGroup = euros % 1000;

    let partsList: string[] = [];

    if (billion > 0) {
      partsList.push(billion === 1 ? 'un milliard' : `${convertGroup(billion)} milliards`);
    }

    if (million > 0) {
      partsList.push(million === 1 ? 'un million' : `${convertGroup(million)} millions`);
    }

    if (thousand > 0) {
      if (thousand === 1) {
        partsList.push('mille');
      } else {
        partsList.push(`${convertGroup(thousand)} mille`);
      }
    }

    if (unitGroup > 0) {
      partsList.push(convertGroup(unitGroup));
    }

    eurosText = partsList.join(' ');
    eurosText += euros === 1 ? ' euro' : ' euros';
  }

  if (cents > 0) {
    let centsText = convertGroup(cents);
    centsText += cents === 1 ? ' centime' : ' centimes';
    return `${eurosText} et ${centsText}`;
  }

  return eurosText;
}

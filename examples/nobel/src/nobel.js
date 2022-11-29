import { useSequentialState } from 'react-seq';

export function useNobelPrize(category, year) {
  return useSequentialState(async function*({ defer, signal }) {
    if (!category || !year) {
      return;
    }
    const prizeURL = new URL(`https://api.nobelprize.org/2.1/nobelPrize/${category}/${year}`);
    const [ {
      categoryFullName,
      prizeAmount,
      prizeAmountAdjusted,
      laureates
    } ] = await fetchJSON(prizeURL, { signal });
    let prize = {
      fullName: str(categoryFullName),
      amount: prizeAmount,
      amountAdjusted: prizeAmountAdjusted,
      laureates: laureates?.map(({ fullName, orgName, motivation }) => {
        return {
          fullName: str(fullName) ?? str(orgName),
          motivation: str(motivation),
        };
      }),
    };
    yield prize;
    if (laureates) {
      for (const [ index, laureate ] of laureates.entries()) {
        const [ {
          gender,
          birth,
          death,
          nobelPrizes,
          wikipedia,
        } ] = await fetchJSON(laureate.links.href);
        prize = { ...prize };
        const target = prize.laureates[index];
        target.gender = gender;
        target.birth = formatDatePlace(birth);
        target.death = formatDatePlace(death);
        // find the relevant prize
        const matchingPrize = nobelPrizes.find(p => p.awardYear === year);
        target.affiliation = formatAffiliation(matchingPrize?.affiliations?.[0]);
        target.wikipedia = wikipedia.english;
        yield prize;
      }
    }
  }, [ category, year ]);
}

function str(obj) {
  if (!obj) {
    return;
  }
  return obj.en ?? obj.se ?? obj.no;
}

function formatDatePlace(obj) {
  if (!obj) {
    return;
  }
  const { date, place } = obj;
  const { city, country } = place;
  return `${date} (${str(city)}, ${str(country)})`;
}

function formatAffiliation(obj) {
  if (!obj) {
    return;
  }
  const { name, city, country } = obj;
  return `${str(name)} (${str(city)}, ${str(country)})`;
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (res.status !== 200) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

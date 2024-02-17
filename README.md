# Discord bot matchmaking

Current temporary notes for thesis:

- game graph loop
- ideas for non-trivial problems to solve (in Czech)
- research

## High-level game loop solution with data manipulation

![game-loop-data-manipulation.png](https://github.com/spiduso/discord-bot-matchmaking/blob/main/img/game-loop-data-manipulation.png)

## Ideas for non-trivial problems

### Matchmaking - výběr hráčů do zápasu

- sliding windows pro určitý rozsah hodnocení

### Team balancing - vybalancování týmů

- vybalancovat, aby oba týmy měly co nejmenší rozdíl v průměrném hodnocení hráčů
- rozdělovat hráče do jednotlivých týmu po jednom, aby rozdíl v sumě hodnocení bylo nejnižší (není optimální pro široký záběr hodnocení mezi hráči)

### Map selection - výběr mapy

- vybalancovat, aby hráči hráli všechny mapy stejněkrát
- nechat hráče vybrat z top 3 map

### Scoring - ohodnocení hráčů

#### Nápad #1: Offline evaluation

- rekonstrukce proběhlých zápasů zaznamenaných v historii zápasů pomocí vlastního hodnotícího algoritmu a porovnání s ohodnocením od [NeatQueue](https://www.neatqueue.com/leaderboard/1061301529597976700/1061303977460908173). Zápasy jsou uloženy na stránkách třetí strany [tracker.gg](https://tracker.gg/valorant/profile/riot/SEN%20tarik%231337/customs).

##### Výhody

- reálná data

##### Nevýhody

- manuální extrakce dat
- nejasný výsledek rekonstrukce

#### Nápad #2: Virtual simulation

- vytvoření virtuálních hráčů, u kterých si definujeme reálné ohodnocení (ohodnocení přesně odpovídá schopnostem hráče). Hráčům se na začátku přidělí stejné prvotní ohodnocení. Vytvoříme simulaci x zápasů s náhodnými týmy. Vítěz zápasu získáme na základě pravděpodobnosti. Tým s lepším reálným ohodnocení má vyšší pravděpodobnost na výhru. Poté porovnáme reálné ohodnocení s ohodnocením po simulaci.
- silně závislé na matchmakingu a pravděpodobnosti

##### Výhody

- jednoduše definovatelné, které ohodnocení je lepší (jak moc se blíží simulované hodnocení s reálným)

##### Nevýhody

- silně závislé na matchmakingu pro korektní hodnotící algoritmus

## Research (so far)

### Social Informatics, 2014[^SocialInformatics]

- section about "Developing Game-Structure Sensitive
Matchmaking System for Massive-Multiplayer
Online Games"
- examines League of Legends (LOL) matchmaking system and suggests a better ranking system
- matchmaking is a key feature
- proposes matchmaking based on roles
- was implemented later in 2014 - [introduction video](https://www.youtube.com/watch?v=AkNYbj_Wvks)

- META - most effective tactic available - talking about role distribution

|           | Bronze teams  | Challenger teams  |
|---------- |-------------- |------------------ |
| META      | 71.97%        | 91.16%            |
| off-META  | 28.03%        | 8.84%             |

table above shows percentage of team tactic usage in different ranks in LOL

- teams with off-META team tends to have an AFK player (23%) than team with META team (6%)

|          | Victory | Defeat |
|----------|---------|--------|
| META     | 51.02%  | 49.98% |
| off-META | 41.50%  | 58.50% |

table above shows percentage of game result based on team tactic usage

- conclusion of the study is that team with more players playing on their preferred role has higher chance of winning than the other team. Study was based on 2000 games between July and August 2014 with META teams, non-AFK games and regular games without untraditional movement of players in the first 15 minutes  

[^SocialInformatics]: [Aiello, L.M. and McFarland, D., Social Informatics.](https://link.springer.com/content/pdf/10.1007/978-3-319-13734-6.pdf)

### Ranking and matchmaking, 2006 [^RankingAndMatchmaking]

- good matchmaking is key to provide players best possible experience and retain players' engagement
- skill based matchmaking - gap between highest rating and lowest rating is not too large to create unbalanced game but not too low to find players quickly
- FIDE Elo rating - predict probability of a game outcome between players purely based on their skill rating

[^RankingAndMatchmaking]: [Graepel, T. and Herbrich, R., 2006. Ranking and matchmaking. Game Developer Magazine, 25, p.34.](https://www.microsoft.com/en-us/research/wp-content/uploads/2006/10/Game-Developer-Feature-Article-Graepel-Herbrich.pdf)

### Theoretical foundations of team matchmaking, 2017[^TheoricalFoundations]

- fairness - how different is team skills of the teams
- uniformity - how big is the gap between the best rated player and the worst rated player

- imbalance function - f(X,Y) = alfa * dp(X, Y), vq(X + Y)
  - dp - fairness function
  - vq - uniformity function
  - alfa - parameter with which we decide how more important fairness is than uniformity

[^TheoricalFoundations]: [Alman, J. and McKay, D., 2017, May. Theoretical foundations of team matchmaking. In Proceedings of the 16th Conference on Autonomous Agents and MultiAgent Systems (pp. 1073-1081).](https://www.ifaamas.org/Proceedings/aamas2017/pdfs/p1073.pdf)

### TrueSkill

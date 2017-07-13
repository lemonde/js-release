[![bitHound Overall Score](https://www.bithound.io/projects/badges/df14fad0-3fa4-11e7-9e8c-41dfde680279/score.svg)](https://www.bithound.io/github/lemonde/js-release)
[![bitHound Dependencies](https://www.bithound.io/projects/badges/df14fad0-3fa4-11e7-9e8c-41dfde680279/dependencies.svg)](https://www.bithound.io/github/lemonde/js-release/master/dependencies/npm)

# js-release

## Comment l'utiliser ?

* Aides, commandes et options : `node cli help` (or other)
* Afficher le changelog, c'est à dire les commits de merge depuis la dernière release : `node cli changelog`
* Créer une release, mode interactif : `node cli add (patch|minor|major)`
* Créer une release initiale, mode interactif : `node cli init`

## Scripts pré release / post release

Il est possible d'exécuter un script :
- après la confirmation de la création d'une release
- après la création de la release
- afficher un changelog personnalisé (string ou fonction, prenant en paramètre la version courante)

par défaut le changelog sera le suivant:
`git log --merges --pretty='* %b (%h)' ${registry.currentVersion}..HEAD`

---

Ajouter un fichier `.release.js` à la racine du projet:

```
module.exports = {
  preRelease: 'touch foo && git add foo && git commit -m "chore(deploy): update"',
  postRelease: 'echo "release creation succeeded"',
  changelogCmd: 'git log'
};
```

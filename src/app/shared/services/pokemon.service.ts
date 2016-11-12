import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {Observable} from 'rxjs';
import {PokemonList} from '../models/pokemon-list';
import {PokemonEntry} from '../models/pokemon-entry';
import * as _ from 'lodash';
import 'rxjs/add/operator/map';
import {Pokemon} from '../models/pokemon';
import {PokemonAbilityInfo} from '../models/pokemon-ability-info';
import {PokemonAbility} from '../models/pokemon-ability';
import {PokemonDescription} from '../models/pokemon-description';
import {PokemonStats} from '../models/pokemon-stats';
import {PokemonType} from '../models/pokemon-type';

@Injectable()
export class PokemonService {
  private _baseUrl: string = 'http://pokeapi.co/api/v2';
  private _spriteBaseUrl: string = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other-sprites/official-artwork';
  private _detailRegex = /^http:\/\/pokeapi.co\/api\/v2\/pokemon\/(\d+)\/$/;
  private _language = 'en';

  constructor(private _http: Http) { }

  findAll(offset: number = 0, limit: number = 20): Observable<PokemonList> {
    return this._http
      .get(`${this._baseUrl}/pokemon/?offset=${offset}&limit=${limit}`)
      .map(response => response.json())
      .map(results => this.getList(results));
  }

  findOne(id: number): Observable<Pokemon> {
    return Observable.forkJoin(
      this._http.get(`${this._baseUrl}/pokemon/${id}/`).map(response => response.json()),
      this._http.get(`${this._baseUrl}/pokemon-species/${id}/`).map(response => response.json())
    ).map(data => new Pokemon(
      new PokemonEntry(data[0].id, _.capitalize(data[0].name), `${this._spriteBaseUrl}/${data[0].id}.png`),
      new PokemonAbilityInfo(data[0].height, data[0].weight, this.getAbilities(data[0].abilities), this.getCategory(data[1].genera)),
      this.getDescriptions(data[1]['flavor_text_entries']),
      this.getTypes(data[0].types),
      this.getStats(data[0].stats)
    ));
  }

  getList(data):PokemonList {
    return new PokemonList(_.map(data.results, result => this.getEntry(result)), data.count);
  }

  getEntry(data): PokemonEntry {
    const matches = this._detailRegex.exec(data.url),
      id = matches == null ? null : parseInt(matches[1]),
      sprite = id == null ? null : `${this._spriteBaseUrl}/${id}.png`;
    return new PokemonEntry(id , _.capitalize(data.name), sprite);
  }

  getAbilities(abilities: any[]): PokemonAbility[] {
    return _(abilities)
      .map(ability => new PokemonAbility(ability.ability.name, ability['is_hidden'], ability.slot))
      .orderBy('order')
      .value();
  }

  getCategory(genera: any[]): string {
    return _(genera)
      .filter(genera => genera.language.name === this._language)
      .map(genera => genera.genus)
      .first();
  }

  getDescriptions(entries: any[]): PokemonDescription[] {
    return _(entries)
      .filter(entry => entry.language.name === this._language)
      .map(entry => new PokemonDescription(entry['flavor_text'], _.startCase(_.replace(entry.version.name, '-', ' '))))
      .value();
  }

  getTypes(types: any[]): PokemonType[] {
    return _(types)
      .map(type => new PokemonType(type.type.name, type.slot))
      .orderBy('order')
      .value();
  }

  getStats(stats: any[]): PokemonStats {
    return new PokemonStats(
      _.find(stats, stat => stat.stat.name === 'hp')['base_stat'],
      _.find(stats, stat => stat.stat.name === 'attack')['base_stat'],
      _.find(stats, stat => stat.stat.name === 'defense')['base_stat'],
      _.find(stats, stat => stat.stat.name === 'special-attack')['base_stat'],
      _.find(stats, stat => stat.stat.name === 'special-defense')['base_stat'],
      _.find(stats, stat => stat.stat.name === 'speed')['base_stat']
    );
  }
}

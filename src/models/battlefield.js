const getSymbolForPos=require('../lib/lib.js').getSymbolForPos;

class Battlefield {
  constructor(){
    this.allPositions = [];
    this.placedPositions = {};
    this.lakeArea = ['5_2','5_3','4_2','4_3','5_6','5_7','4_6','4_7'];
    this.battlePositions = {};
    this.selectedPos = '';
    this.battleResults = [];
    this.revealPieces ={};
    this.updatedLocations = [];
    this.killedPieceLocations = [];
    this.moveType = 'freeMove';
  }
  setField(pieces,placedArmyPos){
    let allPos = Object.keys(placedArmyPos);
    allPos.forEach(pos=>{
      let pieceId = placedArmyPos[pos];
      let piece = pieces.getPiece(pieceId);
      this.addPiece(piece,pos);
    });
  }
  addPiece(piece,pos){
    this.placedPositions[pos] = piece;
  }
  setFieldFor(playerId,pieces,placedArmyPos){
    this.setField(pieces,placedArmyPos);
    this.battlePositions[playerId] = this.placedPositions;
    this.placedPositions = {};
  }
  getArmy(playerId){
    let army = {};
    let allPos = this.getArmyPos(playerId);
    allPos.forEach(pos=>{
      army[pos]=this.battlePositions[playerId][pos].id;
    });
    return army;
  }
  getArmyPos(playerId){
    return Object.keys(this.battlePositions[playerId]);
  }
  getOpponentPos(playerId){
    return this.getArmyPos([1-playerId]);
  }
  areBothArmyDeployed(){
    let battlePositions = this.battlePositions;
    return Object.keys(battlePositions).length==2;
  }
  getPiece(playerId, pieceLoc){
    return this.battlePositions[playerId][pieceLoc];
  }
  getLakePos(){
    return this.lakeArea;
  }
  getPosMap(playerId){
    let posMap = {};
    posMap.myArmy = this.getArmyPos(playerId);
    posMap.opponentArmy = this.getOpponentPos(playerId);
    posMap.lakeArea = this.getLakePos();
    return posMap;
  }
  getPotentialMoves(playerId, pieceLoc){
    let piece = this.getPiece(playerId,pieceLoc);
    if(!piece){
      return '';
    }
    let posMap = this.getPosMap(playerId);
    return piece.getPotentialMoves(pieceLoc,posMap);
  }
  hasLastSelectedLoc(){
    return this.selectedPos;
  }
  addAsLastSelectedLoc(playerId,pos){
    let piece = this.getPiece(playerId,pos);
    if(piece && piece.isMovable()){
      this.selectedPos = pos;
      return true;
    }
  }
  updateBattlefield(playerId,pieceLoc){
    let potentialMoves = this.getPotentialMoves(playerId,this.selectedPos);
    if(this.isFreeMove(potentialMoves,pieceLoc)){
      this.moveType = 'freeMove';
      this.replacePieceLoc(playerId,pieceLoc);
      this.setUpdatedLocations(this.selectedPos,pieceLoc);
      this.removeSelectedPos();
      return true;
    }
    if(this.isAttackMove(potentialMoves,pieceLoc)){
      this.moveType = 'battle';
      this.setRevealPieces(playerId,this.selectedPos,pieceLoc);
      this.setUpdatedLocations(this.selectedPos,pieceLoc);
      this.battle(playerId,pieceLoc);
      return true;
    }
  }
  isFreeMove(potentialMoves,pieceLoc){
    if(potentialMoves){
      return potentialMoves.freeMoves.includes(pieceLoc);
    }
  }
  isAttackMove(potentialMoves,pieceLoc){
    if(potentialMoves){
      return potentialMoves.attackMoves.includes(pieceLoc);
    }
  }
  battle(playerId,pieceLoc){
    let opponentId = 1-playerId;
    let piece = this.getPiece(playerId,this.selectedPos);
    let opponentPiece = this.getPiece(opponentId,pieceLoc);
    let killedPieces = opponentPiece.attackedBy(piece);
    if(killedPieces.defendingPiece){
      this.setBattleResult(opponentId,opponentPiece,pieceLoc);
      delete this.battlePositions[opponentId][pieceLoc];
    }
    if(killedPieces.attackingPiece){
      this.setBattleResult(playerId,piece,this.selectedPos);
      delete this.battlePositions[playerId][this.selectedPos];
    } else {
      this.replacePieceLoc(playerId,pieceLoc);
    }
    this.resetKilledPieces();
  }
  replacePieceLoc(playerId,pieceLoc){
    let piece = this.getPiece(playerId,this.selectedPos);
    this.battlePositions[playerId][pieceLoc] = piece;
    delete this.battlePositions[playerId][this.selectedPos];
  }
  removeSelectedPos(){
    this.selectedPos = false;
  }
  getEmptyPositions(armyPos){
    return this.allPositions.filter(pos=>!armyPos[pos]);
  }
  addPosition(pos){
    this.allPositions.push(pos);
  }
  getBattleResults(){
    return this.battleResults;
  }
  setBattleResult(playerId,piece,pieceLoc){
    let result = {playerId:playerId,killedPiece:piece};
    this.battleResults.push(result);
    this.killedPieceLocations.push(pieceLoc);
  }
  clearBattleResult(){
    this.battleResults = [];
  }
  revealArmyFor(playerId){
    let allArmy = this.getArmy(playerId);
    let opponentArmy = this.getArmy(1-playerId);
    let opponentArmyPos = this.getOpponentPos(playerId);
    opponentArmyPos.forEach(armyPos=>{
      allArmy[armyPos] = `O_${opponentArmy[armyPos]}`;
    });
    return allArmy;
  }
  setRevealPieces(playerId,selectedPos,battlePos){
    let opponentId =1-playerId;
    let attackingPieceId = this.getPiece(playerId,selectedPos).id;
    let defendingPieceId = this.getPiece(opponentId,battlePos).id;
    this.revealPieces[playerId] = {pos:selectedPos,pieceId:attackingPieceId};
    this.revealPieces[opponentId] = {pos:battlePos,pieceId:defendingPieceId};
  }
  getRevealPiece(playerId){
    let revealPiece = {};
    let opponentId = 1-playerId;
    if(!this.revealPieces[playerId]){
      return revealPiece;
    }
    revealPiece.loc = this.revealPieces[opponentId].pos;
    revealPiece.pieceId = `O_${this.revealPieces[opponentId].pieceId}`;
    return revealPiece;
  }
  setUpdatedLocations(selectedLoc,currentLoc){
    this.updatedLocations = [selectedLoc,currentLoc];
  }
  getUpdatedLocations(){
    return this.updatedLocations;
  }
  getMoveType(){
    return this.moveType;
  }
  getKilledPiecesLocs(){
    return this.killedPieceLocations;
  }
  resetKilledPieces(){
    setTimeout(()=>{
      this.killedPieceLocations = [];
      this.revealPieces = {};
    },1200);
  }
  getBattlefieldFor(playerId) {
    let armyPos = this.getArmy(playerId);
    let opponentPos = this.getOpponentPos(playerId);
    let lakePos = this.getLakePos();
    armyPos = getSymbolForPos(armyPos,opponentPos,'O');
    armyPos = getSymbolForPos(armyPos,lakePos,'X');
    let emptyPos = this.getEmptyPositions(armyPos);
    armyPos = getSymbolForPos(armyPos,emptyPos,'E');
    return armyPos;
  }
  revealBattlefieldFor(playerId){
    let revealArmy = this.revealArmyFor(playerId);
    let lakePos = this.getLakePos();
    revealArmy = getSymbolForPos(revealArmy,lakePos,'X');
    let emptyPos = this.getEmptyPositions(revealArmy);
    let completeBattlefield = getSymbolForPos(revealArmy,emptyPos,'E');
    let boardInfo = {
      'battlefield': completeBattlefield
    };
    return boardInfo;
  }
}
module.exports = Battlefield;

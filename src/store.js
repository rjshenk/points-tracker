import Vue from 'vue'
import Vuex from 'vuex'
import firebase from '@/firebase.js'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    weights: {},
    competitions: []
  },
  mutations: {
    SET_COMPETITIONS: (state, competitions) => {
      state.competitions = competitions
    },
    REMOVE_COMPETITION: (state, id) => {
      Vue.delete(state.competitions, state.competitions.findIndex(comp => comp.id === id))
    },
    ADD_COMPETITIONS: (state, newCompetition) => {
      state.competitions.unshift(newCompetition)
    },
    UPDATE_COMPETITION: (state, newCompetition) => {
      const index = state.competitions.findIndex(comp => comp.id === newCompetition.id)
      Vue.set(state.competitions, index, newCompetition)
    },
    SET_WEIGHTS: (state, weights) => {
      state.weights = Object.keys(weights).reduce((acc, weight) => {
        acc[weight] = weights[weight].value
        return acc
      }, {})
    },
    REMOVE_WEIGHT: (state, id) => {
      Vue.delete(state.weights, id)
    },
    ADD_WEIGHT: (state, newWeight) => {
      Vue.set(state.weights, newWeight.name, newWeight.value)
    }
  },
  actions: {
    getCompetitions ({commit}) {
      return firebase.firestore().collection('competitions').get()
        .then((querySnapshot) => {
          const competitions = []
          querySnapshot.forEach((doc) => {
            const competition = { id: doc.id, ...doc.data() }
            if (!competition.approvalState) competition.approvalState = 'submitted'
            competitions.push(competition)
          })
          commit('SET_COMPETITIONS', competitions)
        })
    },
    addCompetition ({commit}, newCompetition) {
      newCompetition.approvalState = 'submitted'

      if (newCompetition.tied) {
        const otherTeam = {...newCompetition, winner: newCompetition.loser, loser: newCompetition.winner}
        firebase.firestore().collection('competitions').add(otherTeam)
          .then((docRef) => {
            commit('ADD_COMPETITIONS', {...otherTeam, id: docRef.id})
          })
      }
      return firebase.firestore().collection('competitions').add(newCompetition)
        .then((docRef) => {
          commit('ADD_COMPETITIONS', {...newCompetition, id: docRef.id})
        })
    },
    removeCompetition ({commit}, id) {
      return firebase.firestore().collection('competitions').doc(id).delete()
        .then(() => {
          commit('REMOVE_COMPETITION', id)
        }).catch((error) => {
          console.error('Error removing document: ', error)
        })
    },
    updateCompetition ({ commit }, updatedCompetition) {
      return firebase.firestore().collection('competitions').doc(updatedCompetition.id)
        .set(updatedCompetition)
        .then(() => {
          commit('UPDATE_COMPETITION', updatedCompetition)
        })
    },
    getWeights ({commit}) {
      return firebase.firestore().collection('weights').get()
        .then((querySnapshot) => {
          let weights = {}
          querySnapshot.forEach((doc) => {
            weights[doc.id] = doc.data()
          })
          commit('SET_WEIGHTS', weights)
        })
    },
    addWeight ({ commit }, newWeight) {
      return firebase.firestore().collection('weights').doc(newWeight.name).set({value: newWeight.value})
        .then((docRef) => {
          commit('ADD_WEIGHT', newWeight)
        })
    },
    removeWeight ({ commit }, weightName) {
      return firebase.firestore().collection('weights').doc(weightName).delete()
        .then(() => {
          commit('REMOVE_WEIGHT', weightName)
        }).catch((error) => {
          console.error('Error removing weight: ', error)
        })
    }
  },
  getters: {
    competitionNames: state => Object.keys(state.weights),
    currentUserRoll: () => {
      // not sure if i should be storing currentUser in state
      // return firebase.auth().currentUser.roll
      return firebase.auth().currentUser ? 'admin' : 'student'
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})

export default store

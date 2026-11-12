/*
 * Настройки приложения MrCHAO.
 *
 * Здесь можно один раз указать общие для всей команды данные —
 * тогда каждому сотруднику не придётся ничего вводить вручную.
 *
 * 1) teamCode — код команды (придумайте свой, например "magazin-7").
 *    Все, кто открывает приложение с этим файлом, попадают в одну команду.
 *
 * 2) firebase — конфигурация бесплатного проекта Firebase (Realtime Database).
 *    Инструкция: README.md → «Как включить синхронизацию».
 *    Без этого приложение работает локально (данные только на устройстве).
 *
 * Пример:
 *
 * window.SMENA_CONFIG = {
 *   teamCode: "magazin-7",
 *   firebase: {
 *     apiKey: "AIzaSy...",
 *     authDomain: "smena-12345.firebaseapp.com",
 *     databaseURL: "https://smena-12345-default-rtdb.europe-west1.firebasedatabase.app",
 *     projectId: "smena-12345",
 *     storageBucket: "smena-12345.appspot.com",
 *     messagingSenderId: "1234567890",
 *     appId: "1:1234567890:web:abcdef"
 *   }
 * };
 */

window.SMENA_CONFIG = {
  teamCode: "mrchao-podsolnuh",
  firebase: {
    apiKey: "AIzaSyCJQoYsQB4bj7toOupZoFuw5IWLKouhZsM",
    authDomain: "smena-23755.firebaseapp.com",
    databaseURL: "https://smena-23755-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "smena-23755",
    storageBucket: "smena-23755.firebasestorage.app",
    messagingSenderId: "944663222286",
    appId: "1:944663222286:web:c5513b19c7cf8d6923445f",
  },
};

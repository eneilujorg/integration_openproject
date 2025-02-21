<template>
  <div class="wrapper">
    <div><input v-model="ncUrl" class="inputField"></div>
    <div><input v-model="username" class="inputField"></div>
    <div><input v-model="password" class="inputField"></div>
    <div><input v-model="folderId" class="inputField"></div>
    <button @click="sendRequest">Submit</button>
  </div>
</template>

<script>
import axios from 'axios'
import FormData from 'form-data'
export default {
  name: 'HomePage',
  data:() => ({
    ncUrl: null,
    username:null,
    password:null,
    folderId:null
  }),
  methods: {
    sendRequest: async function (){
      let result = await axios.post('http://cors.test:3000/token',{
        host: this.ncUrl,
        username: this.username,
        password: this.password,
        folder_id: this.folderId
      })
      console.log(result.data.token)
      const formData = new FormData();
      formData.append('file','/src/assets/logo.png')
      await axios({
        headers: { "Content-Type": "multipart/form-data" },
        method: "post",
        url: `${this.ncUrl}/index.php/apps/integration_openproject/direct-upload/${result.data.token}`,
        formData
      });
    }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.wrapper {
  align-items: center;
  display:flex;
  flex-direction: column;
}
.inputField{
  padding: 10px;
  margin:10px;
}
</style>

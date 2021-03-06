const routeToTest='/api/my-bucket';
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const {app, runServer, closeServer} = require('../server');
const {MyBucket} = require('../routes/my-bucket/models');
const {Users} = require('../routes/users/models');
const {TEST_DATABASE_URL} = require('../config');
chai.use(chaiHttp);
const expect = chai.expect;

let user_details={
  username:faker.name.firstName(),
  password:faker.random.word()
}

describe('test user auth and my-bucket endpoint',()=>{
  beforeEach((done)=>{
    // reset user mode (passed auth or not) before each test
    Users.remove({},(err)=>{
      console.log(err);
      done();
    })
  });

  describe('resgister user, login and check auth',(done)=>{
    chai.request(app)
      .post('/api/users')
      .send(user_details)
      .end((err,res)=>{
        console.log('This was user registration');
        expect(res).to.have.status(201);

        // after registration, login
        chai.request(app)
          .post('/api/auth/login')
          .send(user_details)
          .end((err,res)=>{
            console.log('This was user login (auth)');
            expect(res).to.have.status(200);
            expect(res.body).to.include.keys('authToken');
	          const {authToken}=res.body;
            // request protected endpoint, use agent instead of chai for request
            return 
              describe('GET /my-bucket endpoint', function() {
              it('should have status 200', function() {
                return MyBucket
                .findOne()
                .then(function(dbItem){
                  return username=dbItem.username;
                })
                .then(username=>{
                  agent.request(app)
                  .get(routeToTest)
                  .set('authorization',`bearer ${authToken}`)
                  .then(function(_res) {
                    expect(_res).to.have.status(200);
                  })
                })
              });
            });
            
            describe('POST /my-bucket endpoint', function() {
              // POST will 1) create an item in database and 2) return the created item.
              // so must check 1) the response has correct code and content contains correct keys and 2) the response matches the newly created database item
              it('should add a new item', function() {
                // newItem compliant with model schema, not virtuals
                const newItem = {
                  username: faker.name.firstName(),
                  tickets:[
            		    {
            		      what:faker.random.word(),
            		      where:"",
            		      type:"unsorted",
            		      details:faker.random.word()
            		    }
            		  ]
                };
                return agent.request(app)
                .post(routeToTest)
                .send(newItem)
                .set('authorization',`bearer ${authToken}`)
                .then(function(res) {
                  expect(res).to.have.status(201);
                  expect(res).to.be.json;
                  expect(res.body).to.be.a('object');
                  expect(res.body).to.include.keys('id', 'tickets');
                  
                  // check response match request
                  expect(res.body.tickets[0].what).to.equal(newItem.tickets[0].what);
                  // cause Mongo should have created id on insertion
                  expect(res.body.id).to.not.be.null;
                  // pass value to next .then()
                  return MyBucket.findById(res.body.id);
                })
                .then(function(dbItem) {
                  // check db item match request
                  expect(dbItem.tickets[0].what).to.equal(newItem.tickets[0].what);
                });
              });
            }); 
            
            describe('PUT /my-bucket/ticket/:ticketId endpoint', function() {
              // get an existing item from db
              // PUT to update that item
              // check 1) response body contains the request body data (the updated data) and 2) that item in db is updated correctly
              it('should update fields you send over', function() {
                const updateData = {
                  details: 'test PUT endpoint'
                };

                return MyBucket
                .findOne()
                .then(function(dbItem) {
                  updateData.id = dbItem.id;
                  return agent.request(app)
                  .put(`${routeToTest}/ticket/${dbItem.id}`)
                  .send(updateData)
                  .set('authorization',`bearer ${authToken}`)
                })
                .then(function(res) {
                  // this res is the PUT response, verify response status is as expected
                  expect(res).to.have.status(200);
                  return MyBucket.findById(updateData.id);
                })
                .then(function(dbItem) {
                  // check dbItem is updated (same with request)
                  expect(dbItem.details).to.equal(updateData.details);
                });
              });
            });
            
            describe('DELETE endpoint', function() {
              // get a db item so get its id
              // DELETE that item
              // check response status code and prove that item is removed from db
              it('delete an item by id', function() {
                let dbItem;
                return MyBucket
                .findOne()
                .then(function(_dbItem) {
                  dbItem = _dbItem;
                  return agent.request(app)
                    .delete(`${routeToTest}/ticket/${dbItem.id}`)
                    .set('authorization',`bearer ${authToken}`)
                })
                .then(function(res) {
                  expect(res).to.have.status(204);
                  return MyBucket.findById(dbItem.id);
                })
                .then(function(_dbItem) {
                  expect(_dbItem).to.be.null;
                });
              });
            });
          })
      })
  });
});
